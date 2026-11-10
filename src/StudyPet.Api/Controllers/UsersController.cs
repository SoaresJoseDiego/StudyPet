using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Auth;
using StudyPet.Api.Users;
using StudyPet.Application;
using StudyPet.Infrastructure;
using UserEntity = StudyPet.Domain.User;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(
    StudyPetDbContext dbContext,
    IPasswordHasher<UserEntity> passwordHasher,
    JwtTokens tokens) : ControllerBase
{
    private const int MinPasswordLength = 8;
    private const int MaxPasswordLength = 128;

    // Verificado quando o e-mail não existe, para a resposta levar o mesmo tempo de uma senha errada.
    private static readonly string UnknownUserHash =
        new PasswordHasher<UserEntity>().HashPassword(new UserEntity(), Guid.NewGuid().ToString());

    [AllowAnonymous]
    [HttpPost]
    public async Task<IActionResult> Create(
        CreateUserRequest request,
        CancellationToken cancellationToken)
    {
        var displayName = request.DisplayName.Trim();
        var email = request.Email.Trim().ToLowerInvariant();
        var characterName = string.IsNullOrWhiteSpace(request.CharacterName)
            ? "Pip"
            : request.CharacterName.Trim();
        if (characterName.Length > 40) characterName = characterName[..40];

        if (string.IsNullOrWhiteSpace(displayName))
        {
            return BadRequest(new
            {
                message = "O nome de exibição é obrigatório."
            });
        }

        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new
            {
                message = "O e-mail é obrigatório."
            });
        }

        if (PasswordProblem(request.Password) is { } passwordProblem)
        {
            return BadRequest(new
            {
                message = passwordProblem
            });
        }

        var emailAlreadyUsed = await dbContext.Users
            .AnyAsync(user => user.Email == email, cancellationToken);

        if (emailAlreadyUsed)
        {
            return Conflict(new
            {
                message = "Já existe um usuário com este e-mail."
            });
        }

        var user = new UserEntity
        {
            DisplayName = displayName,
            Email = email,
            Character = new()
            {
                Name = characterName
            }
        };
        user.PasswordHash = passwordHasher.HashPassword(user, request.Password);

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/users/{user.Id}", ToAuthResponse(user));
    }

    /// <summary>
    /// Entra com e-mail e senha e devolve o token. E-mail desconhecido e senha errada têm a mesma resposta.
    /// Contas antigas, sem senha, só existem em desenvolvimento: lá, a primeira senha usada passa a valer.
    /// </summary>
    [AllowAnonymous]
    [HttpPost("sign-in")]
    public async Task<IActionResult> SignIn(
        SignInRequest request,
        [FromServices] IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrEmpty(request.Password))
        {
            return BadRequest(new
            {
                message = "Informe o e-mail e a senha."
            });
        }

        var user = await dbContext.Users
            .Include(user => user.Character)
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);

        if (user is null)
        {
            passwordHasher.VerifyHashedPassword(new UserEntity(), UnknownUserHash, request.Password);
            return InvalidCredentials();
        }

        if (user.PasswordHash is null)
        {
            if (!environment.IsDevelopment()) return InvalidCredentials();

            if (PasswordProblem(request.Password) is { } passwordProblem)
            {
                return BadRequest(new
                {
                    message = passwordProblem
                });
            }

            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await dbContext.SaveChangesAsync(cancellationToken);
            return Ok(ToAuthResponse(user));
        }

        var verification = passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (verification == PasswordVerificationResult.Failed) return InvalidCredentials();

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, request.Password);
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        return Ok(ToAuthResponse(user));
    }

    [HttpGet("{userId:int}")]
    public async Task<IActionResult> GetById(int userId, CancellationToken cancellationToken)
    {
        var user = await dbContext.Users
            .AsNoTracking()
            .Include(user => user.Character)
            .FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        return Ok(ToResponse(user));
    }

    [HttpPut("{userId:int}/daily-goal")]
    public async Task<IActionResult> UpdateDailyGoal(
        int userId,
        UpdateDailyGoalRequest request,
        CancellationToken cancellationToken)
    {
        if (request.Minutes is < DailyGoal.MinGoalMinutes or > DailyGoal.MaxGoalMinutes)
        {
            return BadRequest(new
            {
                message = $"A meta diária deve ficar entre {DailyGoal.MinGoalMinutes} e {DailyGoal.MaxGoalMinutes} minutos."
            });
        }

        var user = await dbContext.Users
            .FirstOrDefaultAsync(user => user.Id == userId, cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        user.DailyGoalMinutes = request.Minutes;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            user.Id,
            user.DailyGoalMinutes
        });
    }

    private static string? PasswordProblem(string password) =>
        password.Length is < MinPasswordLength or > MaxPasswordLength
            ? $"A senha deve ter entre {MinPasswordLength} e {MaxPasswordLength} caracteres."
            : null;

    private UnauthorizedObjectResult InvalidCredentials() => Unauthorized(new
    {
        message = "E-mail ou senha incorretos."
    });

    private object ToAuthResponse(UserEntity user) => new
    {
        user.Id,
        user.DisplayName,
        user.Email,
        user.DailyGoalMinutes,
        Character = user.Character is null ? null : CharacterResponse.From(user.Character),
        Token = tokens.Create(user)
    };

    private static object ToResponse(UserEntity user) => new
    {
        user.Id,
        user.DisplayName,
        user.Email,
        user.DailyGoalMinutes,
        Character = user.Character is null ? null : CharacterResponse.From(user.Character)
    };
}