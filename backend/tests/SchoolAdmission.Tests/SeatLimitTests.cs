using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace SchoolAdmission.Tests;

public class SeatLimitTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public SeatLimitTests(ApiFactory factory) => _client = factory.CreateClient();

    // ---- 1. REQUIRED CONCURRENCY TEST ----
    [Fact]
    public async Task Concurrent_applications_never_exceed_total_seats()
    {
        var cls = await Api.CreateClass(_client, seats: 10);

        // All 200 tasks wait at a "starting gate" so they fire at the same moment.
        var gate = new TaskCompletionSource();
        var tasks = Enumerable.Range(0, 200).Select(i => Task.Run(async () =>
        {
            await gate.Task;
            return await Api.Send(_client, HttpMethod.Post,
                $"/classes/{cls.Id}/holds", Api.StudentId(i));
        })).ToList();

        gate.SetResult(); // open the gate
        var responses = await Task.WhenAll(tasks);

        Assert.Equal(10, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(190, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));

        var after = await Api.GetClass(_client, cls.Id);
        Assert.Equal(10, after.HeldSeats);
        Assert.Equal(0, after.AvailableSeats);
        Assert.True(after.HeldSeats + after.ConfirmedSeats <= after.TotalSeats);
    }

    // ---- 2. Duplicate confirm counts once ----
    [Fact]
    public async Task Duplicate_confirms_increase_confirmed_seats_only_once()
    {
        var cls = await Api.CreateClass(_client, seats: 5);
        var student = Api.StudentId(1);
        var hold = await Api.Apply(_client, cls.Id, student);

        var gate = new TaskCompletionSource();
        var tasks = Enumerable.Range(0, 20).Select(_ => Task.Run(async () =>
        {
            await gate.Task;
            return await Api.Send(_client, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student);
        })).ToList();
        gate.SetResult();
        var responses = await Task.WhenAll(tasks);

        Assert.All(responses, r => Assert.Equal(HttpStatusCode.OK, r.StatusCode));

        var after = await Api.GetClass(_client, cls.Id);
        Assert.Equal(1, after.ConfirmedSeats);
        Assert.Equal(0, after.HeldSeats);
        Assert.Equal(4, after.AvailableSeats);
    }

    // ---- 3. Same student cannot hold twice in one class ----
    [Fact]
    public async Task Same_student_cannot_hold_twice_in_same_class()
    {
        var cls = await Api.CreateClass(_client, seats: 5);
        var student = Api.StudentId(1);

        await Api.Apply(_client, cls.Id, student);
        var second = await Api.Send(_client, HttpMethod.Post, $"/classes/{cls.Id}/holds", student);

        Assert.Equal(HttpStatusCode.Conflict, second.StatusCode);
        Assert.Equal(1, (await Api.GetClass(_client, cls.Id)).HeldSeats);
    }

    // ---- 5. Small checks ----
    [Theory]
    [InlineData(null)]                 // header missing
    [InlineData("123")]                // too short
    [InlineData("1234567890123456a")]  // 17 chars but not all digits
    public async Task Apply_with_bad_student_id_returns_400(string? badId)
    {
        var cls = await Api.CreateClass(_client, seats: 5);
        var response = await Api.Send(_client, HttpMethod.Post, $"/classes/{cls.Id}/holds", badId);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Confirming_another_students_hold_returns_403()
    {
        var cls = await Api.CreateClass(_client, seats: 5);
        var hold = await Api.Apply(_client, cls.Id, Api.StudentId(1));

        var response = await Api.Send(_client, HttpMethod.Post,
            $"/holds/{hold.HoldId}/confirm", Api.StudentId(2));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("HELD", (await Api.GetHold(_client, hold.HoldId)).Status);
    }

    [Fact]
    public async Task Cancel_frees_the_seat()
    {
        var cls = await Api.CreateClass(_client, seats: 1);
        var student = Api.StudentId(1);
        var hold = await Api.Apply(_client, cls.Id, student);
        Assert.Equal(0, (await Api.GetClass(_client, cls.Id)).AvailableSeats);

        var cancel = await Api.Send(_client, HttpMethod.Delete, $"/holds/{hold.HoldId}", student);

        Assert.Equal(HttpStatusCode.NoContent, cancel.StatusCode);
        Assert.Equal(1, (await Api.GetClass(_client, cls.Id)).AvailableSeats);
        Assert.Equal("CANCELLED", (await Api.GetHold(_client, hold.HoldId)).Status);
    }

    [Fact]
    public async Task Blank_class_name_returns_400()
    {
        var response = await _client.PostAsJsonAsync("/classes", new { name = "   ", totalSeats = 5 });
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Duplicate_class_name_returns_409()
    {
        var name = "Dup-" + Guid.NewGuid();
        await Api.CreateClass(_client, seats: 5, name);

        var response = await _client.PostAsJsonAsync("/classes", new { name, totalSeats = 5 });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Apply_to_unknown_class_returns_404()
    {
        var response = await Api.Send(_client, HttpMethod.Post,
            "/classes/c_doesnotexist/holds", Api.StudentId(1));
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}