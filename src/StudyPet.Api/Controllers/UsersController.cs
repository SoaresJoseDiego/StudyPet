using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Users;
using StudyPet.Application;
using StudyPet.Infrastructure;
using UserEntity = StudyPet.Domain.User;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users")]
public sealed class UsersController(StudyPetDbContext dbContext) : ControllerBase
{
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

        dbContext.Users.Add(user);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/users/{user.Id}", ToResponse(user));
    }

    /// <summary>
    /// Entrada PROVISÓRIA só por e-mail, sem senha, para o front reabrir a conta.
    /// Substituir por autenticação de verdade (senha/JWT) antes de qualquer deploy.
    /// Fora do ambiente Development o endpoint nem existe (404).
    /// </summary>
    [HttpPost("sign-in")]
    public async Task<IActionResult> SignIn(
        SignInRequest request,
        [FromServices] IWebHostEnvironment environment,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment())
            return NotFound();

        var email = request.Email?.Trim().ToLowerInvariant();

        if (string.IsNullOrWhiteSpace(email))
        {
            return BadRequest(new
            {
                message = "O e-mail é obrigatório."
            });
        }

        var user = await dbContext.Users
            .AsNoTracking()
            .Include(user => user.Character)
            .FirstOrDefaultAsync(user => user.Email == email, cancellationToken);

        if (user is null)
        {
            return NotFound(new
            {
                message = "Nenhuma conta encontrada com este e-mail."
            });
        }

        return Ok(ToResponse(user));
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

    private static object ToResponse(UserEntity user) => new
    {
        user.Id,
        user.DisplayName,
        user.Email,
        user.DailyGoalMinutes,
        Character = user.Character is null ? null : CharacterResponse.From(user.Character)
    };
}