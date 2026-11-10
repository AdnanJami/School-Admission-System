using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace SchoolAdmission.Tests;

public record AdminHoldDto(string HoldId, string ClassId, string ClassName, string StudentId,
    string Status, DateTime ExpiresAt, DateTime CreatedAt);

public class AdminHoldsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public AdminHoldsTests(ApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Admin_holds_lists_applications_of_all_students_without_a_student_header()
    {
        var cls = await Api.CreateClass(_client, seats: 5);
        var a = await Api.Apply(_client, cls.Id, Api.StudentId(1));
        var b = await Api.Apply(_client, cls.Id, Api.StudentId(2));
        await Api.Send(_client, HttpMethod.Post, $"/holds/{b.HoldId}/confirm", Api.StudentId(2));

        var response = await _client.GetAsync("/admin/holds?limit=2000");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var all = (await response.Content.ReadFromJsonAsync<List<AdminHoldDto>>())!;
        var mine = all.Where(h => h.ClassId == cls.Id).ToList();

        Assert.Equal(2, mine.Count);
        Assert.Equal("HELD", mine.Single(h => h.HoldId == a.HoldId).Status);
        Assert.Equal("CONFIRMED", mine.Single(h => h.HoldId == b.HoldId).Status);
        Assert.All(mine, h => Assert.Equal(cls.Name, h.ClassName));
        Assert.Equal(Api.StudentId(1), mine.Single(h => h.HoldId == a.HoldId).StudentId);
    }
}
