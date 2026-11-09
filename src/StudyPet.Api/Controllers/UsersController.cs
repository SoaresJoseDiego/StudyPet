using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Users;
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

        return Created($"/api/users/{user.Id}", new
        {
            user.Id,
            user.DisplayName,
            user.Email,
            Character = new
            {
                user.Character!.Id,
                user.Character.Name,
                user.Character.Level,
                user.Character.Experience,
                user.Character.Coins
            }
        });
    }
}