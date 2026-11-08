using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;
using SchoolAdmission.Api;
using SchoolAdmission.Api.Dtos;

namespace SchoolAdmission.Api.Controllers;

[ApiController]
[Route("classes")]
public class ClassesController : ControllerBase
{
    private readonly AppDbContext _db;

    public ClassesController(AppDbContext db)
    {
        _db = db;
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateClassRequest request)
    {
        var name = request.Name.Trim();

        var exists = await _db.Classes.AnyAsync(c => c.Name == name);
        if (exists)
        {
            return Conflict(new ErrorResponse("A class with this name already exists."));
        }

        var schoolClass = new SchoolClass
        {
            Id = "c_" + Guid.NewGuid().ToString("N"),
            Name = name,
            TotalSeats = request.TotalSeats
        };

        _db.Classes.Add(schoolClass);

        try
        {
            await _db.SaveChangesAsync();
        }
        catch (DbUpdateException ex)
            when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Another request created the same name between our check and the insert
            return Conflict(new ErrorResponse("A class with this name already exists."));
        }

        var response = new ClassResponse
        {
            Id = schoolClass.Id,
            Name = schoolClass.Name,
            TotalSeats = schoolClass.TotalSeats
        };

        return CreatedAtAction(nameof(GetById), new { classId = schoolClass.Id }, response);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var now = DateTime.UtcNow;

        var classes = await _db.Classes.AsNoTracking().ToListAsync();

        var heldCounts = await _db.Holds.AsNoTracking()
            .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt > now)
            .GroupBy(h => h.ClassId)
            .Select(g => new { ClassId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ClassId, x => x.Count);

        var confirmedCounts = await _db.Holds.AsNoTracking()
            .Where(h => h.Status == HoldStatus.Confirmed)
            .GroupBy(h => h.ClassId)
            .Select(g => new { ClassId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ClassId, x => x.Count);

        var result = classes.Select(c => ToDetails(
            c,
            heldCounts.GetValueOrDefault(c.Id),
            confirmedCounts.GetValueOrDefault(c.Id)));

        return Ok(result);
    }

    [HttpGet("{classId}")]
    public async Task<IActionResult> GetById(string classId)
    {
        var schoolClass = await _db.Classes
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == classId);

        if (schoolClass is null)
        {
            return NotFound(new ErrorResponse("Class not found."));
        }

        return Ok(await BuildDetailsAsync(schoolClass));
    }
    private static ClassDetailsResponse ToDetails(SchoolClass c, int held, int confirmed) => new()
    {
        Id = c.Id,
        Name = c.Name,
        TotalSeats = c.TotalSeats,
        HeldSeats = held,
        ConfirmedSeats = confirmed,
        AvailableSeats = c.TotalSeats - held - confirmed
    };

    private async Task<ClassDetailsResponse> BuildDetailsAsync(SchoolClass c)
    {
        var now = DateTime.UtcNow;

        var held = await _db.Holds.CountAsync(h =>
            h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now);

        var confirmed = await _db.Holds.CountAsync(h =>
            h.ClassId == c.Id && h.Status == HoldStatus.Confirmed);

        return ToDetails(c, held, confirmed);
    }
}