using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using StudyPet.Api.Achievements;
using StudyPet.Api.Auth;
using StudyPet.Api.Courses;
using StudyPet.Application;
using StudyPet.Domain;
using StudyPet.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<StudyPetDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("StudyPet")));

builder.Services.AddScoped<AchievementService>();

var jwtKey = JwtTokens.LoadKey(builder.Configuration);
builder.Services.AddSingleton(new JwtTokens(jwtKey));
builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidIssuer = JwtTokens.Issuer,
            ValidAudience = JwtTokens.Audience,
            IssuerSigningKey = jwtKey,
            ValidAlgorithms = [SecurityAlgorithms.HmacSha256]
        };
        options.Events = new JwtBearerEvents
        {
            // 401 no mesmo formato { message } das outras respostas de erro.
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsJsonAsync(new { message = "Sessão expirada ou inválida. Entre novamente." });
            }
        };
    });

// Tudo exige login, menos o que for marcado com [AllowAnonymous].
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

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

app.UseAuthentication();
app.UseAuthorization();

// Toda rota com {userId} só serve ao dono do token. Recurso de outro usuário responde 404, não 403.
app.Use(async (context, next) =>
{
    if (context.Request.RouteValues.TryGetValue("userId", out var routeUserId)
        && routeUserId?.ToString() != context.User.FindFirst(JwtRegisteredClaimNames.Sub)?.Value)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsJsonAsync(new { message = "Usuário não encontrado." });
        return;
    }

    await next();
});

app.MapControllers();

app.MapGet("/api/system/status", () => Results.Ok(new
{
    name = "StudyPet API",
    status = "healthy",
    utcNow = DateTimeOffset.UtcNow
})).AllowAnonymous();

// Regras do jogo (slimes, waves, curva de níveis e formas) para a tela "Sistema de Exp".
app.MapGet("/api/game/rules", () => Results.Ok(new
{
    Slimes = Slimes.Info.Values.Select(info => new { info.Kind, info.Name, info.Experience, info.Rarity }),
    Odds = new { Lilas = 0.60, Azul = 0.28, Rosa = 0.12 },
    Slimes.WaveSize,
    Slimes.WaveMs,
    Slimes.KingEvery,
    Stages = CharacterProgression.Stages,
    Levels = Enumerable.Range(1, 60).Select(level => new
    {
        Level = level,
        StepCost = CharacterProgression.StepCost(level),
        TotalToReach = CharacterProgression.ExperienceToReach(level)
    })
})).AllowAnonymous();

app.Run();

public partial class Program;
