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
        var classes = await _db.Classes.AsNoTracking().OrderBy(c => c.Name).ToListAsync();
        var counts = await GetSeatCountsAsync();

        return Ok(classes.Select(c =>
        {
            counts.TryGetValue(c.Id, out var s);
            return ToDetails(c, s?.Held ?? 0, s?.Confirmed ?? 0);
        }));
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
    private class SeatCounts
    {
        public string ClassId { get; set; } = "";
        public int Held { get; set; }
        public int Confirmed { get; set; }
    }

    private async Task<Dictionary<string, SeatCounts>> GetSeatCountsAsync(string? classId = null)
    {
        var now = DateTime.UtcNow;

        var rows = await _db.Database
            .SqlQuery<SeatCounts>($"""
                SELECT "ClassId",
                    (COUNT(*) FILTER (WHERE "Status" = 'Held' AND "ExpiresAt" > {now}))::int AS "Held",
                    (COUNT(*) FILTER (WHERE "Status" = 'Confirmed'))::int AS "Confirmed"
                FROM "Holds"
                WHERE ({classId}::text IS NULL OR "ClassId" = {classId})
                AND "Status" IN ('Held', 'Confirmed')
                GROUP BY "ClassId"
                """)
            .ToListAsync();

        return rows.ToDictionary(r => r.ClassId);
    }

    private async Task<ClassDetailsResponse> BuildDetailsAsync(SchoolClass c)
    {
        var counts = await GetSeatCountsAsync(c.Id);
        counts.TryGetValue(c.Id, out var s);
        return ToDetails(c, s?.Held ?? 0, s?.Confirmed ?? 0);
    }
}