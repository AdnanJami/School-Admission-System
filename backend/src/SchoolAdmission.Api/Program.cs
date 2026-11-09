using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api;
using System.Globalization;
using SchoolAdmission.Api.Config;
using SchoolAdmission.Api.Services;
using SchoolAdmission.Api.Data;
var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();
var connectionString = builder.Configuration.GetConnectionString("Default")
    ?? throw new InvalidOperationException(
        "Connection string 'Default' is not configured. Set ConnectionStrings__Default.");

builder.Services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
builder.Services.AddHostedService<HoldExpiryService>();
// Read and validate the hold duration once, at startup
var rawDuration = builder.Configuration["HOLD_DURATION_SECONDS"];
var holdDurationSeconds = 600;

if (!string.IsNullOrWhiteSpace(rawDuration))
{
    if (!int.TryParse(rawDuration, NumberStyles.Integer, CultureInfo.InvariantCulture, out holdDurationSeconds)
        || holdDurationSeconds <= 0)
    {
        throw new InvalidOperationException(
            $"HOLD_DURATION_SECONDS must be a positive integer, but was '{rawDuration}'.");
    }
}

builder.Services.AddSingleton(new HoldSettings { DurationSeconds = holdDurationSeconds });
var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwaggerUI(options =>
    {
        options.SwaggerEndpoint("/openapi/v1.json", "School Admission API v1");
    });
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();
await DatabaseMigrator.MigrateWithRetryAsync(app.Services, app.Logger);
app.Run();
