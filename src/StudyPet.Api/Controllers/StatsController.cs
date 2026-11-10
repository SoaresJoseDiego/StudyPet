using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.StudySessions;
using StudyPet.Application;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

/// <summary>
/// Números das telas Início, Meu pet, Histórico e Bestiário. Os slimes de cada sessão
/// são gravados ao concluir (ver <see cref="Slimes"/>).
/// </summary>
[ApiController]
[Route("api/users/{userId:int}/stats")]
public sealed class StatsController(StudyPetDbContext dbContext) : ControllerBase
{
    private const int ChartDays = 7;

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

        var sessions = await dbContext.StudySessions
            .AsNoTracking()
            .Where(session => session.UserId == userId && session.Status == SessionStatus.Completed)
            .Select(session => new
            {
                FinishedAt = session.FinishedAt!.Value,
                session.FocusMinutes,
                session.EarnedExperience,
                Tally = new SlimeTally(session.SlimesLilas, session.SlimesAzul, session.SlimesRosa, session.SlimesRei),
                CourseId = session.Lesson!.Module!.CourseId,
                CourseTitle = session.Lesson.Module.Course!.Title,
                LessonTitle = session.Lesson.Title
            })
            .ToListAsync(cancellationToken);

        var today = StudyDay.Today();
        var weekStart = StudyDay.StartOfWeek();
        var chartStart = today.AddDays(-(ChartDays - 1));

        var slimes = sessions.Aggregate(SlimeTally.Empty, (total, session) => total + session.Tally);
        var streak = StudyStreak.Calculate(sessions.Select(session => StudyDay.DayOf(session.FinishedAt)), today);

        var thisWeek = sessions.Where(session => StudyDay.DayOf(session.FinishedAt) >= weekStart).ToList();
        var lastDays = sessions.Where(session => StudyDay.DayOf(session.FinishedAt) >= chartStart).ToList();

        var dailyMinutes = Enumerable.Range(0, ChartDays)
            .Select(offset => chartStart.AddDays(offset))
            .Select(day => new
            {
                Date = day,
                Minutes = lastDays.Where(session => StudyDay.DayOf(session.FinishedAt) == day).Sum(session => session.FocusMinutes)
            })
            .ToList();

        var courses = await dbContext.Courses
            .AsNoTracking()
            .Where(course => course.UserId == userId && !course.IsArchived)
            .OrderBy(course => course.Title)
            .Select(course => new { course.Id, course.Title, course.WeeklyGoalMinutes })
            .ToListAsync(cancellationToken);

        var weekByCourse = courses
            .Select(course => new
            {
                CourseId = course.Id,
                course.Title,
                Minutes = thisWeek.Where(session => session.CourseId == course.Id).Sum(session => session.FocusMinutes),
                GoalMinutes = course.WeeklyGoalMinutes
            })
            .ToList();

        var last = sessions.MaxBy(session => session.FinishedAt);
        // "Último encontro": o slime mais forte derrotado na última sessão.
        SlimeKind? lastKind = last is null || last.Tally.Total == 0
            ? null
            : new[] { SlimeKind.Rei, SlimeKind.Rosa, SlimeKind.Azul, SlimeKind.Lilas }.First(kind => last.Tally.CountOf(kind) > 0);

        return Ok(new
        {
            Today = new
            {
                FocusMinutes = sessions.Where(session => StudyDay.DayOf(session.FinishedAt) == today).Sum(session => session.FocusMinutes)
            },
            Week = new
            {
                StartsOn = weekStart,
                FocusMinutes = thisWeek.Sum(session => session.FocusMinutes),
                Experience = thisWeek.Sum(session => session.EarnedExperience),
                ByCourse = weekByCourse
            },
            LastDays = new
            {
                FocusMinutes = lastDays.Sum(session => session.FocusMinutes),
                Slimes = lastDays.Sum(session => session.Tally.Total),
                Daily = dailyMinutes
            },
            Streak = new
            {
                streak.Current,
                streak.Longest
            },
            Totals = new
            {
                FocusMinutes = sessions.Sum(session => session.FocusMinutes),
                Sessions = sessions.Count,
                Slimes = slimes.Total,
                KingSlimes = slimes.Rei,
                Experience = sessions.Sum(session => session.EarnedExperience)
            },
            Bestiary = Enum.GetValues<SlimeKind>().Select(kind => new
            {
                Kind = kind,
                Slimes.Info[kind].Name,
                Slimes.Info[kind].Experience,
                Slimes.Info[kind].Rarity,
                Defeated = slimes.CountOf(kind)
            }),
            LastEncounter = last is null ? null : new
            {
                last.FinishedAt,
                last.CourseTitle,
                last.LessonTitle,
                last.FocusMinutes,
                last.EarnedExperience,
                Slimes = last.Tally.Total,
                SlimeKind = lastKind,
                SlimeName = lastKind is null ? null : Slimes.Info[lastKind.Value].Name
            }
        });
    }
}
