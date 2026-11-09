using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Achievements;
using StudyPet.Api.Courses;
using StudyPet.Application;
using StudyPet.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<StudyPetDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("StudyPet")));

builder.Services.AddScoped<AchievementService>();

// Leitura da página pública da Udemy: sem seguir redirecionamentos (evita SSRF) e com tempo curto.
builder.Services.AddHttpClient<UdemyPreviewService>(client =>
    {
        client.Timeout = TimeSpan.FromSeconds(8);
        client.DefaultRequestHeaders.UserAgent.ParseAdd("Mozilla/5.0 (compatible; StudyPet/1.0)");
        client.DefaultRequestHeaders.AcceptLanguage.ParseAdd("pt-BR,pt;q=0.9");
    })
    .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler { AllowAutoRedirect = false });

builder.Services.AddControllers()
    .AddJsonOptions(options =>
        options.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter()))
    .ConfigureApiBehaviorOptions(options =>
        // Erros de binding/validação automáticos seguem o mesmo formato { message } dos controllers.
        options.InvalidModelStateResponseFactory = context => new BadRequestObjectResult(new
        {
            message = "Requisição inválida. Verifique os campos enviados.",
            errors = context.ModelState
                .Where(entry => entry.Value is { Errors.Count: > 0 })
                .ToDictionary(
                    entry => entry.Key,
                    entry => entry.Value!.Errors.Select(error => error.ErrorMessage).ToArray())
        }));

var app = builder.Build();

app.UseHttpsRedirection();

app.MapControllers();

app.MapGet("/api/system/status", () => Results.Ok(new
{
    name = "StudyPet API",
    status = "healthy",
    utcNow = DateTimeOffset.UtcNow
}));

// Regras do jogo (slimes, waves, curva de níveis e formas) para a tela "Sistema de Exp".
app.MapGet("/api/game/rules", () => Results.Ok(new
{
    Slimes = Slimes.Info.Values.Select(info => new { info.Kind, info.Name, info.Experience, info.Rarity }),
    Odds = new { Lilas = 0.60, Azul = 0.28, Rosa = 0.12 },
    WaveSizes = new { One = 0.25, Two = 0.50, Three = 0.25 },
    Slimes.WaveMs,
    Slimes.KingEvery,
    Stages = CharacterProgression.Stages,
    Levels = Enumerable.Range(1, 60).Select(level => new
    {
        Level = level,
        StepCost = CharacterProgression.StepCost(level),
        TotalToReach = CharacterProgression.ExperienceToReach(level)
    })
}));

app.Run();

public partial class Program;
