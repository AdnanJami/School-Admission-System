using Microsoft.AspNetCore.Mvc.Testing;

namespace SchoolAdmission.Tests;

// Starts your real API in memory, connected to a separate test database.
public class ApiFactory : WebApplicationFactory<Program>
{
    public ApiFactory() : this(600) { }

    protected ApiFactory(int holdSeconds)
    {
        Environment.SetEnvironmentVariable("ConnectionStrings__Default",
            "Host=localhost;Port=5433;Database=admission_test;Username=admission;Password=admission;Maximum Pool Size=50;Timeout=60");
        Environment.SetEnvironmentVariable("HOLD_DURATION_SECONDS", holdSeconds.ToString());

        _ = Server; // build the app now, while the variables above are set
    }
}

// Same API, but holds expire after 2 seconds (used only by the expiry test).
public class ShortHoldApiFactory : ApiFactory
{
    public ShortHoldApiFactory() : base(2) { }
}