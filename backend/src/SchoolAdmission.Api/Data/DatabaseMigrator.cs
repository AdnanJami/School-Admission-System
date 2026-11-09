using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Data;

public static class DatabaseMigrator
{
    public static async Task MigrateWithRetryAsync(
        IServiceProvider services, ILogger logger, int maxAttempts = 15)
    {
        for (var attempt = 1; ; attempt++)
        {
            try
            {
                using var scope = services.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                await db.Database.MigrateAsync();
                logger.LogInformation("Database is up to date.");
                return;
            }
            catch (Exception ex) when (attempt < maxAttempts)
            {
                logger.LogWarning(ex,
                    "Database not ready (attempt {Attempt}/{Max}). Retrying in 2 seconds...",
                    attempt, maxAttempts);
                await Task.Delay(TimeSpan.FromSeconds(2));
            }
        }
    }
}