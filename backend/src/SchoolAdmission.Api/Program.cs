using Microsoft.EntityFrameworkCore;
using SchoolAdmission.Api;
using System.Globalization;
using SchoolAdmission.Api.Config;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

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
}

app.UseHttpsRedirection();

app.UseAuthorization();

app.MapControllers();

app.Run();
