using System.Net;
using Xunit;

namespace SchoolAdmission.Tests;

public class ExpiryTests : IClassFixture<ShortHoldApiFactory>
{
    private readonly HttpClient _client;

    public ExpiryTests(ShortHoldApiFactory factory) => _client = factory.CreateClient();

    [Fact]
    public async Task Expired_hold_returns_seat_and_cannot_be_confirmed()
    {
        var cls = await Api.CreateClass(_client, seats: 1);
        var student = Api.StudentId(1);
        var hold = await Api.Apply(_client, cls.Id, student);

        Assert.Equal(0, (await Api.GetClass(_client, cls.Id)).AvailableSeats);

        await Task.Delay(TimeSpan.FromSeconds(3)); // hold lasts 2 seconds

        Assert.Equal("EXPIRED", (await Api.GetHold(_client, hold.HoldId)).Status);

        var after = await Api.GetClass(_client, cls.Id);
        Assert.Equal(1, after.AvailableSeats);
        Assert.Equal(0, after.HeldSeats);

        var confirm = await Api.Send(_client, HttpMethod.Post, $"/holds/{hold.HoldId}/confirm", student);
        Assert.Equal(HttpStatusCode.Conflict, confirm.StatusCode);

        // The released seat can be taken by someone else.
        await Api.Apply(_client, cls.Id, Api.StudentId(2));
    }
}