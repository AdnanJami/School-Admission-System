using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace SchoolAdmission.Tests;

// Only the fields from the PDF contract. Tests act like the graders' client.
public record ClassDto(string Id, string Name, int TotalSeats, int HeldSeats, int ConfirmedSeats, int AvailableSeats);
public record HoldDto(string HoldId, string ClassId, string? StudentId, string Status, DateTime ExpiresAt);

public static class Api
{
    // 17-digit student ids: 10000000000000000, 10000000000000001, ...
    public static string StudentId(int i) => (10_000_000_000_000_000L + i).ToString();

    public static Task<HttpResponseMessage> Send(
        HttpClient client, HttpMethod method, string url, string? studentId = null)
    {
        var request = new HttpRequestMessage(method, url);
        if (studentId != null) request.Headers.Add("X-Student-Id", studentId);
        return client.SendAsync(request);
    }

    public static async Task<ClassDto> CreateClass(HttpClient client, int seats, string? name = null)
    {
        var response = await client.PostAsJsonAsync("/classes",
            new { name = name ?? "Test-" + Guid.NewGuid(), totalSeats = seats });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ClassDto>())!;
    }

    public static async Task<ClassDto> GetClass(HttpClient client, string classId)
    {
        var response = await client.GetAsync($"/classes/{classId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<ClassDto>())!;
    }

    // Applies and asserts 201 Created.
    public static async Task<HoldDto> Apply(HttpClient client, string classId, string studentId)
    {
        var response = await Send(client, HttpMethod.Post, $"/classes/{classId}/holds", studentId);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<HoldDto>())!;
    }

    public static async Task<HoldDto> GetHold(HttpClient client, string holdId)
    {
        var response = await client.GetAsync($"/holds/{holdId}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<HoldDto>())!;
    }
}