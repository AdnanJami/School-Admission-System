using Microsoft.EntityFrameworkCore;

namespace SchoolAdmission.Api.Services;

public class HoldExpiryService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromSeconds(5);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<HoldExpiryService> _logger;

    public HoldExpiryService(IServiceScopeFactory scopeFactory, ILogger<HoldExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await Task.Delay(Interval, stoppingToken);

                using var scope = _scopeFactory.CreateScope();
                var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                var now = DateTime.UtcNow;
                var expired = await db.Holds
                    .Where(h => h.Status == HoldStatus.Held && h.ExpiresAt <= now)
                    .ExecuteUpdateAsync(
                        s => s.SetProperty(h => h.Status, HoldStatus.Expired),
                        stoppingToken);

                if (expired > 0)
                {
                    _logger.LogInformation("Marked {Count} hold(s) as expired.", expired);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Hold expiry job failed.");
            }
        }
    }
}