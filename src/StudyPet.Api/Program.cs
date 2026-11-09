using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Users;
using StudyPet.Application;
using StudyPet.Domain;
using StudyPet.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<StudyPetDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("StudyPet")));


builder.Services.AddControllers();

var app = builder.Build();

app.UseHttpsRedirection();

app.MapControllers();

app.MapGet("/api/system/status", () => Results.Ok(new
{
    name = "StudyPet API",
    status = "healthy",
    utcNow = DateTimeOffset.UtcNow
}));

app.MapGet("/api/study/reward-preview", (int minutes, bool firstSession = false, bool dailyGoalReached = false) =>
{
    if (minutes is < 1 or > 240)
        return Results.BadRequest(new { message = "Minutes must be between 1 and 240." });

    return Results.Ok(StudyRewardCalculator.Calculate(minutes, firstSession, dailyGoalReached));
});



app.Run();

public partial class Program;
