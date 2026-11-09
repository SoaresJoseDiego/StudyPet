using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Achievements;
using StudyPet.Api.StudySessions;
using StudyPet.Api.Users;
using StudyPet.Application;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users/{userId:int}/study-sessions")]
public sealed class StudySessionsController(StudyPetDbContext dbContext, AchievementService achievements) : ControllerBase
{
    private const int DefaultPlannedMinutes = 25;
    private const int MinMinutes = 1;
    private const int MaxMinutes = 240;

    [HttpPost]
    public async Task<IActionResult> Start(int userId, StartStudySessionRequest request, CancellationToken cancellationToken)
    {
        var plannedMinutes = request.PlannedMinutes ?? DefaultPlannedMinutes;
        if (plannedMinutes is < MinMinutes or > MaxMinutes)
        {
            return BadRequest(new
            {
                message = $"A duração planejada deve ficar entre {MinMinutes} e {MaxMinutes} minutos."
            });
        }

        var lesson = await dbContext.Lessons
            .Include(lesson => lesson.Module!.Course)
            .FirstOrDefaultAsync(lesson => lesson.Id == request.LessonId
                && lesson.Module!.Course!.UserId == userId, cancellationToken);
        if (lesson is null)
        {
            return NotFound(new
            {
                message = "Aula não encontrada."
            });
        }

        var activeSessionId = await dbContext.StudySessions
            .Where(session => session.UserId == userId && session.Status == SessionStatus.InProgress)
            .Select(session => (int?)session.Id)
            .FirstOrDefaultAsync(cancellationToken);
        if (activeSessionId is not null)
        {
            return Conflict(new
            {
                message = "Já existe uma sessão de estudo em andamento. Conclua ou cancele antes de iniciar outra.",
                activeSessionId
            });
        }

        var slimesDefeated = await dbContext.Users
            .Where(user => user.Id == userId)
            .Select(user => user.SlimesDefeated)
            .FirstAsync(cancellationToken);

        var session = new StudySession
        {
            UserId = userId,
            LessonId = lesson.Id,
            StartedAt = DateTimeOffset.UtcNow,
            PlannedMinutes = plannedMinutes,
            Seed = RandomNumberGenerator.GetInt32(1, int.MaxValue),
            SlimeStartIndex = slimesDefeated
        };

        if (lesson.Progress == LessonProgress.NotStarted)
            lesson.Progress = LessonProgress.InProgress;

        dbContext.StudySessions.Add(session);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/users/{userId}/study-sessions/{session.Id}",
            ToResponse(session, lesson.Title, lesson.Module!.Course!.Title, lesson.Module.CourseId));
    }

    /// <summary>Sessão em andamento, com a semente das waves para a tela retomar a batalha.</summary>
    [HttpGet("active")]
    public async Task<IActionResult> GetActive(int userId, CancellationToken cancellationToken)
    {
        var active = await dbContext.StudySessions
            .AsNoTracking()
            .Where(session => session.UserId == userId && session.Status == SessionStatus.InProgress)
            .Select(session => new
            {
                Session = session,
                LessonTitle = session.Lesson!.Title,
                CourseTitle = session.Lesson.Module!.Course!.Title,
                session.Lesson.Module.CourseId
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (active is null)
        {
            return NotFound(new
            {
                message = "Nenhuma sessão de estudo em andamento."
            });
        }

        return Ok(ToResponse(active.Session, active.LessonTitle, active.CourseTitle, active.CourseId));
    }

    [HttpGet]
    public async Task<IActionResult> List(int userId, int take = 20, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 100);

        var sessions = await dbContext.StudySessions
            .AsNoTracking()
            .Where(session => session.UserId == userId)
            .OrderByDescending(session => session.StartedAt)
            .Take(take)
            .Select(session => new
            {
                session.Id,
                session.LessonId,
                LessonTitle = session.Lesson!.Title,
                CourseId = session.Lesson.Module!.CourseId,
                CourseTitle = session.Lesson.Module.Course!.Title,
                session.Status,
                session.StartedAt,
                session.FinishedAt,
                session.PlannedMinutes,
                session.FocusMinutes,
                session.EarnedExperience,
                session.EarnedCoins,
                Slimes = session.SlimesLilas + session.SlimesAzul + session.SlimesRosa + session.SlimesRei,
                KingSlimes = session.SlimesRei
            })
            .ToListAsync(cancellationToken);

        return Ok(sessions);
    }

    [HttpPost("{sessionId:int}/finish")]
    public async Task<IActionResult> Finish(int userId, int sessionId, FinishStudySessionRequest request, CancellationToken cancellationToken)
    {
        if (request.FocusSeconds is < 0 or > MaxMinutes * 60)
        {
            return BadRequest(new
            {
                message = $"O tempo de foco deve ficar entre 0 e {MaxMinutes} minutos."
            });
        }

        var session = await dbContext.StudySessions
            .Include(session => session.Lesson)
            .FirstOrDefaultAsync(session => session.Id == sessionId && session.UserId == userId, cancellationToken);
        if (session is null)
        {
            return NotFound(new
            {
                message = "Sessão de estudo não encontrada."
            });
        }

        if (session.Status != SessionStatus.InProgress)
        {
            return Conflict(new
            {
                message = "Esta sessão de estudo já foi encerrada."
            });
        }

        var user = await dbContext.Users
            .Include(user => user.Character)
            .FirstAsync(user => user.Id == userId, cancellationToken);
        var character = user.Character;

        var startOfToday = StudyDay.StartOfToday();
        var completedToday = dbContext.StudySessions
            .Where(other => other.UserId == userId
                && other.Status == SessionStatus.Completed
                && other.FinishedAt >= startOfToday);
        var sessionsBefore = await completedToday.CountAsync(cancellationToken);
        var minutesBefore = await completedToday.SumAsync(other => other.FocusMinutes, cancellationToken);

        var focusMinutes = request.FocusSeconds / 60;
        var slimes = Slimes.Tally(session.Seed, session.SlimeStartIndex, request.FocusSeconds);
        var firstSessionOfDay = sessionsBefore == 0;
        var dailyGoalReached = DailyGoal.IsCompletedBy(minutesBefore, focusMinutes, user.DailyGoalMinutes);
        var reward = StudyRewardCalculator.Calculate(slimes, focusMinutes, firstSessionOfDay, dailyGoalReached);

        session.Status = SessionStatus.Completed;
        session.FinishedAt = DateTimeOffset.UtcNow;
        session.FocusSeconds = request.FocusSeconds;
        session.FocusMinutes = focusMinutes;
        session.BreakMinutes = reward.SuggestedBreakMinutes;
        session.SlimesLilas = slimes.Lilas;
        session.SlimesAzul = slimes.Azul;
        session.SlimesRosa = slimes.Rosa;
        session.SlimesRei = slimes.Rei;
        session.EarnedExperience = reward.Experience;
        session.EarnedCoins = reward.Coins;
        user.SlimesDefeated = session.SlimeStartIndex + slimes.Total;

        if (request.CompleteLesson)
            session.Lesson!.Progress = LessonProgress.Completed;

        var previousLevel = character?.Level ?? 1;
        if (character is not null)
        {
            character.Experience += reward.Experience;
            character.Coins += reward.Coins;
            character.Level = CharacterProgression.LevelFor(character.Experience);
        }

        await dbContext.SaveChangesAsync(cancellationToken);
        var newAchievements = await achievements.AwardAsync(userId, cancellationToken);

        return Ok(new
        {
            Session = ToResponse(session, session.Lesson!.Title, null, null),
            Reward = new
            {
                reward.Experience,
                reward.Coins,
                reward.SuggestedBreakMinutes,
                FirstSessionOfDay = firstSessionOfDay,
                DailyGoalReached = dailyGoalReached,
                BaseExperience = slimes.Experience
            },
            Slimes = new
            {
                slimes.Lilas,
                slimes.Azul,
                slimes.Rosa,
                slimes.Rei,
                slimes.Total
            },
            LessonProgress = session.Lesson!.Progress,
            Character = character is null ? null : CharacterResponse.From(character),
            LeveledUp = character is not null && character.Level > previousLevel,
            Evolved = character is not null
                && CharacterProgression.StageFor(character.Level).Number
                    > CharacterProgression.StageFor(previousLevel).Number,
            Today = new
            {
                FocusMinutes = minutesBefore + focusMinutes,
                GoalMinutes = user.DailyGoalMinutes
            },
            NewAchievements = newAchievements.Select(AchievementService.ToSummary)
        });
    }

    [HttpPost("{sessionId:int}/cancel")]
    public async Task<IActionResult> Cancel(int userId, int sessionId, CancellationToken cancellationToken)
    {
        var session = await dbContext.StudySessions
            .FirstOrDefaultAsync(session => session.Id == sessionId && session.UserId == userId, cancellationToken);
        if (session is null)
        {
            return NotFound(new
            {
                message = "Sessão de estudo não encontrada."
            });
        }

        if (session.Status != SessionStatus.InProgress)
        {
            return Conflict(new
            {
                message = "Esta sessão de estudo já foi encerrada."
            });
        }

        session.Status = SessionStatus.Cancelled;
        session.FinishedAt = DateTimeOffset.UtcNow;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToResponse(session, null, null, null));
    }

    private static object ToResponse(StudySession session, string? lessonTitle, string? courseTitle, int? courseId) => new
    {
        session.Id,
        session.UserId,
        session.LessonId,
        LessonTitle = lessonTitle,
        CourseId = courseId,
        CourseTitle = courseTitle,
        session.Status,
        session.StartedAt,
        session.FinishedAt,
        session.PlannedMinutes,
        session.FocusSeconds,
        session.FocusMinutes,
        session.BreakMinutes,
        session.Seed,
        session.SlimeStartIndex,
        session.EarnedExperience,
        session.EarnedCoins
    };
}
