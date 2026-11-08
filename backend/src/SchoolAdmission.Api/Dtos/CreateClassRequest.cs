using System.ComponentModel.DataAnnotations;

namespace SchoolAdmission.Api.Dtos;

public class CreateClassRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;

    [Range(1, int.MaxValue)]
    public int TotalSeats { get; set; }
}