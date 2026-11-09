using Microsoft.EntityFrameworkCore;
using StudyPet.Api.StudySessions;
using StudyPet.Application;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Achievements;

/// <summary>
/// Mede o progresso do usuário e grava as conquistas que acabaram de ser atingidas.
/// Chamado depois de ações que podem desbloquear algo (concluir sessão, registro, curso).
/// </summary>
public sealed class AchievementService(StudyPetDbContext dbContext)
{
    public async Task<AchievementProgress> MeasureAsync(int userId, CancellationToken cancellationToken)
    {
        var sessions = await dbContext.StudySessions
            .AsNoTracking()
            .Where(session => session.UserId == userId && session.Status == SessionStatus.Completed)
            .Select(session => new { session.FinishedAt, session.FocusMinutes, session.SlimesRei })
            .ToListAsync(cancellationToken);

        var level = await dbContext.Characters
            .Where(character => character.UserId == userId)
            .Select(character => character.Level)
            .FirstOrDefaultAsync(cancellationToken);

        var courses = await dbContext.Courses
            .Where(course => course.UserId == userId)
            .Select(course => new
            {
                Total = course.Modules.SelectMany(module => module.Lessons).Count(),
                Completed = course.Modules.SelectMany(module => module.Lessons)
                    .Count(lesson => lesson.Progress == LessonProgress.Completed)
            })
            .ToListAsync(cancellationToken);

        var notes = await dbContext.StudyNotes.CountAsync(note => note.UserId == userId, cancellationToken);

        var streak = StudyStreak.Calculate(
            sessions.Where(session => session.FinishedAt is not null).Select(session => StudyDay.DayOf(session.FinishedAt!.Value)),
            StudyDay.Today());

        return new AchievementProgress(
            LongestStreak: streak.Longest,
            KingSlimes: sessions.Sum(session => session.SlimesRei),
            FocusMinutes: sessions.Sum(session => session.FocusMinutes),
            Level: Math.Max(1, level),
            CoursesAdded: courses.Count,
            CoursesCompleted: courses.Count(course => course.Total > 0 && course.Completed == course.Total),
            Notes: notes);
    }

    /// <summary>Grava e devolve as conquistas novas. Não chama SaveChanges de outras alterações pendentes.</summary>
    public async Task<IReadOnlyList<AchievementDefinition>> AwardAsync(int userId, CancellationToken cancellationToken)
    {
        var progress = await MeasureAsync(userId, cancellationToken);
        var earned = await dbContext.UserAchievements
            .Where(achievement => achievement.UserId == userId)
            .Select(achievement => achievement.Key)
            .ToListAsync(cancellationToken);

        var newOnes = Application.Achievements.NewlyEarned(progress, earned.ToHashSet());
        if (newOnes.Count == 0) return newOnes;

        foreach (var definition in newOnes)
            dbContext.UserAchievements.Add(new UserAchievement { UserId = userId, Key = definition.Key });

        await dbContext.SaveChangesAsync(cancellationToken);
        return newOnes;
    }

    public static object ToSummary(AchievementDefinition definition) => new
    {
        definition.Key,
        definition.Name,
        definition.Description,
        definition.Icon
    };
}
