using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Achievements;
using StudyPet.Infrastructure;
using Definitions = StudyPet.Application.Achievements;

namespace StudyPet.Api.Controllers;

/// <summary>Tela "Conquistas": as 18 medalhas, com data de quem já ganhou e progresso de quem falta.</summary>
[ApiController]
[Route("api/users/{userId:int}/achievements")]
public sealed class AchievementsController(StudyPetDbContext dbContext, AchievementService achievements) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(int userId, CancellationToken cancellationToken)
    {
        var userExists = await dbContext.Users.AnyAsync(user => user.Id == userId, cancellationToken);
        if (!userExists)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        // Garante que conquistas atingidas antes desta versão também apareçam.
        await achievements.AwardAsync(userId, cancellationToken);
        var progress = await achievements.MeasureAsync(userId, cancellationToken);
        var earned = await dbContext.UserAchievements
            .AsNoTracking()
            .Where(achievement => achievement.UserId == userId)
            .ToDictionaryAsync(achievement => achievement.Key, achievement => achievement.EarnedAt, cancellationToken);

        var items = Definitions.All.Select(definition =>
        {
            var value = progress.ValueOf(definition.Metric);
            var earnedAt = earned.TryGetValue(definition.Key, out var at) ? at : (DateTimeOffset?)null;
            return new
            {
                definition.Key,
                definition.Group,
                definition.Icon,
                definition.Name,
                definition.Description,
                definition.Metric,
                definition.Target,
                Value = Math.Min(value, definition.Target),
                Earned = earnedAt is not null,
                EarnedAt = earnedAt
            };
        }).ToList();

        var closest = items
            .Where(item => !item.Earned)
            .OrderByDescending(item => item.Value / (double)item.Target)
            .FirstOrDefault();

        return Ok(new
        {
            EarnedCount = items.Count(item => item.Earned),
            Total = items.Count,
            Closest = closest?.Name,
            Groups = items.GroupBy(item => item.Group).Select(group => new
            {
                Title = group.Key,
                Items = group.ToList()
            })
        });
    }
}
