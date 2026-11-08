using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
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
        var schoolClass = new SchoolClass
        {
            Id = "c_" + Guid.NewGuid().ToString("N"),
            Name = request.Name,
            TotalSeats = request.TotalSeats
        };

        _db.Classes.Add(schoolClass);
        await _db.SaveChangesAsync();

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
        var classes = await _db.Classes.ToListAsync();

        var result = new List<ClassDetailsResponse>();
        foreach (var c in classes)
        {
            result.Add(await BuildDetailsAsync(c));
        }

        return Ok(result);
    }

    [HttpGet("{classId}")]
    public async Task<IActionResult> GetById(string classId)
    {
        var schoolClass = await _db.Classes.FirstOrDefaultAsync(c => c.Id == classId);
        if (schoolClass is null)
        {
            return NotFound();
        }

        return Ok(await BuildDetailsAsync(schoolClass));
    }

    // Shared by both GET endpoints
    private async Task<ClassDetailsResponse> BuildDetailsAsync(SchoolClass c)
    {
        var now = DateTime.UtcNow;

        var held = await _db.Holds.CountAsync(h =>
            h.ClassId == c.Id && h.Status == HoldStatus.Held && h.ExpiresAt > now);

        var confirmed = await _db.Holds.CountAsync(h =>
            h.ClassId == c.Id && h.Status == HoldStatus.Confirmed);

        return new ClassDetailsResponse
        {
            Id = c.Id,
            Name = c.Name,
            TotalSeats = c.TotalSeats,
            HeldSeats = held,
            ConfirmedSeats = confirmed,
            AvailableSeats = c.TotalSeats - held - confirmed
        };
    }
}