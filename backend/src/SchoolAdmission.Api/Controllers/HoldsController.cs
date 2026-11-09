using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api;
using SchoolAdmission.Api.Dtos;
using SchoolAdmission.Api.Helpers;
using SchoolAdmission.Api.Config;
namespace SchoolAdmission.Api.Controllers;

[ApiController]
public class HoldsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly int _holdDurationSeconds;

    public HoldsController(AppDbContext db, HoldSettings settings)
    {
        _db = db;
        _holdDurationSeconds = settings.DurationSeconds;
    }

    [HttpPost("classes/{classId}/holds")]
    public async Task<IActionResult> CreateHold(string classId,
    // Parameter exists only so Swagger shows the header; validation is in StudentIdHeader.
    [FromHeader(Name = "X-Student-Id")] string? studentIdHeader = null)
    {
        // 1. Validate header
        if (!StudentIdHeader.TryGet(Request, out var studentId))
        {
            return BadRequest(new ErrorResponse(
                "X-Student-Id header is required and must be exactly 17 digits."));
        }

        // 2. Transaction (rolls back automatically on early return)
        await using var tx = await _db.Database.BeginTransactionAsync();

        // 3. Lock the class row: other requests for this class wait here
        var schoolClass = await _db.Classes
            .FromSqlInterpolated($"""SELECT * FROM "Classes" WHERE "Id" = {classId} FOR UPDATE""")
            .FirstOrDefaultAsync();

        if (schoolClass is null)
        {
            return NotFound(new ErrorResponse("Class not found."));
        }

        var now = DateTime.UtcNow;

        // 4. Clean up stale holds of this class
        await _db.Holds
            .Where(h => h.ClassId == classId
                        && h.Status == HoldStatus.Held
                        && h.ExpiresAt <= now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Expired));

        // 5. Does this student already have an active hold or confirmed seat?
        var alreadyHas = await _db.Holds.AnyAsync(h =>
            h.ClassId == classId
            && h.StudentId == studentId
            && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed));

        if (alreadyHas)
        {
            await tx.CommitAsync();
            return Conflict(new ErrorResponse(
                "You already have a hold or a confirmed seat in this class."));
        }

        // 6. Are there seats left?
        var taken = await _db.Holds.CountAsync(h =>
            h.ClassId == classId
            && (h.Status == HoldStatus.Held || h.Status == HoldStatus.Confirmed));

        if (taken >= schoolClass.TotalSeats)
        {
            await tx.CommitAsync();
            return Conflict(new ErrorResponse("Class is full."));
        }

        // 7. Insert and commit
        var hold = new Hold
        {
            Id = "h_" + Guid.NewGuid().ToString("N"),
            ClassId = classId,
            StudentId = studentId,
            Status = HoldStatus.Held,
            CreatedAt = now,
            ExpiresAt = now.AddSeconds(_holdDurationSeconds)
        };

        _db.Holds.Add(hold);
        await _db.SaveChangesAsync();
        await tx.CommitAsync();

        // 8. Respond
        var response = new CreateHoldResponse
        {
            HoldId = hold.Id,
            ClassId = hold.ClassId,
            StudentId = hold.StudentId,
            Status = HoldStatusHelper.ToApiString(hold.Status),
            ExpiresAt = hold.ExpiresAt
        };

        return CreatedAtAction(nameof(GetHold), new { holdId = hold.Id }, response);
    }

    [HttpGet("holds/{holdId}")]
    public async Task<IActionResult> GetHold(string holdId)
    {
        var hold = await _db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId);
        if (hold is null)
        {
            return NotFound(new ErrorResponse("Hold not found."));
        }

        var status = HoldStatusHelper.GetEffectiveStatus(hold, DateTime.UtcNow);

        return Ok(new HoldResponse
        {
            HoldId = hold.Id,
            ClassId = hold.ClassId,
            Status = HoldStatusHelper.ToApiString(status),
            ExpiresAt = hold.ExpiresAt
        });
    }
    [HttpPost("holds/{holdId}/confirm")]
    public async Task<IActionResult> ConfirmHold(string holdId,

    // Parameter exists only so Swagger shows the header; validation is in StudentIdHeader.TryGet
    [FromHeader(Name = "X-Student-Id")] string? studentIdHeader = null)
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId))
        {
            return BadRequest(new ErrorResponse(StudentIdHeader.ErrorMessage));
        }

        var now = DateTime.UtcNow;

        var rows = await _db.Holds
            .Where(h => h.Id == holdId
                        && h.StudentId == studentId
                        && h.Status == HoldStatus.Held
                        && h.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Confirmed));

        var confirmed = new ConfirmHoldResponse { HoldId = holdId, Status = "CONFIRMED" };

        if (rows == 1)
        {
            return Ok(confirmed);
        }

        var hold = await _db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId);

        if (hold is null)
        {
            return NotFound(new ErrorResponse("Hold not found."));
        }

        if (hold.StudentId != studentId)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new ErrorResponse("This hold belongs to another student."));
        }

        if (hold.Status == HoldStatus.Confirmed)
        {
            return Ok(confirmed);
        }

        return Conflict(new ErrorResponse(
            hold.Status == HoldStatus.Cancelled ? "Hold was cancelled." : "Hold has expired."));
    }

    [HttpDelete("holds/{holdId}")]
    public async Task<IActionResult> CancelHold(string holdId,
    // Parameter exists only so Swagger shows the header; validation is in StudentIdHeader.
    [FromHeader(Name = "X-Student-Id")] string? studentIdHeader = null)
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId))
        {
            return BadRequest(new ErrorResponse(StudentIdHeader.ErrorMessage));
        }

        var now = DateTime.UtcNow;

        var rows = await _db.Holds
            .Where(h => h.Id == holdId
                        && h.StudentId == studentId
                        && h.Status == HoldStatus.Held
                        && h.ExpiresAt > now)
            .ExecuteUpdateAsync(s => s.SetProperty(h => h.Status, HoldStatus.Cancelled));

        if (rows == 1)
        {
            return NoContent();
        }

        var hold = await _db.Holds.AsNoTracking().FirstOrDefaultAsync(h => h.Id == holdId);

        if (hold is null)
        {
            return NotFound(new ErrorResponse("Hold not found."));
        }

        if (hold.StudentId != studentId)
        {
            return StatusCode(StatusCodes.Status403Forbidden,
                new ErrorResponse("This hold belongs to another student."));
        }

        if (hold.Status == HoldStatus.Cancelled)
        {
            return NoContent();
        }

        return Conflict(new ErrorResponse(
            hold.Status == HoldStatus.Confirmed
                ? "A confirmed hold cannot be cancelled."
                : "Hold has expired."));
    }

    [HttpGet("me/holds")]
    // Parameter exists only so Swagger shows the header; validation is in StudentIdHeader.
    public async Task<IActionResult> GetMyHolds([FromHeader(Name = "X-Student-Id")] string? studentIdHeader = null)
    {
        if (!StudentIdHeader.TryGet(Request, out var studentId))
        {
            return BadRequest(new ErrorResponse(StudentIdHeader.ErrorMessage));
        }

        var rows = await (
            from h in _db.Holds.AsNoTracking()
            join c in _db.Classes.AsNoTracking() on h.ClassId equals c.Id
            where h.StudentId == studentId
            orderby h.CreatedAt descending
            select new { Hold = h, ClassName = c.Name }
        ).ToListAsync();

        var now = DateTime.UtcNow;

        var result = rows.Select(r => new MyHoldResponse
        {
            HoldId = r.Hold.Id,
            ClassId = r.Hold.ClassId,
            ClassName = r.ClassName,
            Status = HoldStatusHelper.ToApiString(
                HoldStatusHelper.GetEffectiveStatus(r.Hold, now)),
            ExpiresAt = r.Hold.ExpiresAt
        });

        return Ok(result);
    }
}