namespace SchoolAdmission.Api.Dtos;

public class CreateHoldResponse
{
    public string HoldId { get; set; } = string.Empty;
    public string ClassId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
}