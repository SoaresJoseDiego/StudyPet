using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.StudySessions;
using StudyPet.Api.Users;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

/// <summary>Resumo para a tela inicial: personagem, meta do dia e sessão em andamento.</summary>
[ApiController]
[Route("api/users/{userId:int}/dashboard")]
public sealed class DashboardController(StudyPetDbContext dbContext) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get(int userId, CancellationToken cancellationToken)
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

        var startOfToday = StudyDay.StartOfToday();
        var completedToday = dbContext.StudySessions
            .Where(session => session.UserId == userId
                && session.Status == SessionStatus.Completed
                && session.FinishedAt >= startOfToday);

        var todayMinutes = await completedToday.SumAsync(session => session.FocusMinutes, cancellationToken);
        var todaySessions = await completedToday.CountAsync(cancellationToken);
        var todayExperience = await completedToday.SumAsync(session => session.EarnedExperience, cancellationToken);

        var activeSession = await dbContext.StudySessions
            .AsNoTracking()
            .Where(session => session.UserId == userId && session.Status == SessionStatus.InProgress)
            .Select(session => new
            {
                session.Id,
                session.LessonId,
                LessonTitle = session.Lesson!.Title,
                session.StartedAt,
                session.PlannedMinutes
            })
            .FirstOrDefaultAsync(cancellationToken);

        var activeCourses = await dbContext.Courses
            .CountAsync(course => course.UserId == userId && !course.IsArchived, cancellationToken);

        return Ok(new
        {
            user.Id,
            user.DisplayName,
            Character = user.Character is null ? null : CharacterResponse.From(user.Character),
            Today = new
            {
                FocusMinutes = todayMinutes,
                GoalMinutes = user.DailyGoalMinutes,
                GoalReached = todayMinutes >= user.DailyGoalMinutes,
                Sessions = todaySessions,
                Experience = todayExperience
            },
            ActiveSession = activeSession,
            ActiveCourses = activeCourses
        });
    }
}
