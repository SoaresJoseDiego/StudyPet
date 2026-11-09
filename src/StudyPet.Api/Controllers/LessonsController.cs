using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Achievements;
using StudyPet.Api.Courses;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users/{userId:int}/courses/{courseId:int}/modules/{moduleId:int}/lessons")]
public sealed class LessonsController(StudyPetDbContext dbContext, AchievementService achievements) : ControllerBase
{
    [HttpPost]
    public Task<IActionResult> Create(int userId, int courseId, int moduleId, CreateLessonRequest request, CancellationToken cancellationToken) =>
        AddLessons(userId, courseId, moduleId, [request.Title], single: true, cancellationToken);

    /// <summary>Várias aulas de uma vez (lista colada, uma por linha no front).</summary>
    [HttpPost("bulk")]
    public Task<IActionResult> CreateMany(int userId, int courseId, int moduleId, CreateLessonsRequest request, CancellationToken cancellationToken) =>
        AddLessons(userId, courseId, moduleId, request.Titles, single: false, cancellationToken);

    private async Task<IActionResult> AddLessons(
        int userId, int courseId, int moduleId, IReadOnlyList<string>? titles, bool single, CancellationToken cancellationToken)
    {
        var clean = CourseRules.CleanTitles(titles);
        if (clean.Count == 0)
        {
            return BadRequest(new
            {
                message = single ? "O título da aula é obrigatório." : "Informe pelo menos uma aula."
            });
        }

        if (clean.Count > CourseRules.MaxLessonsPerRequest)
        {
            return BadRequest(new
            {
                message = $"Cadastre no máximo {CourseRules.MaxLessonsPerRequest} aulas de uma vez."
            });
        }

        var moduleExists = await dbContext.CourseModules
            .AnyAsync(module => module.Id == moduleId
                && module.CourseId == courseId
                && module.Course!.UserId == userId, cancellationToken);
        if (!moduleExists)
        {
            return NotFound(new
            {
                message = "Módulo não encontrado."
            });
        }

        var lastPosition = await dbContext.Lessons
            .Where(lesson => lesson.CourseModuleId == moduleId)
            .Select(lesson => (int?)lesson.Position)
            .MaxAsync(cancellationToken) ?? 0;

        var lessons = clean
            .Select((title, index) => new Lesson { CourseModuleId = moduleId, Title = title, Position = lastPosition + index + 1 })
            .ToList();

        dbContext.Lessons.AddRange(lessons);
        await dbContext.SaveChangesAsync(cancellationToken);

        var created = lessons.Select(lesson => new
        {
            lesson.Id,
            ModuleId = lesson.CourseModuleId,
            lesson.Title,
            lesson.Position,
            lesson.Progress
        }).ToList();

        return single
            ? Created($"/api/users/{userId}/courses/{courseId}/modules/{moduleId}/lessons/{lessons[0].Id}", created[0])
            : Created($"/api/users/{userId}/courses/{courseId}", created);
    }

    [HttpPut("{lessonId:int}/progress")]
    public async Task<IActionResult> UpdateProgress(
        int userId, int courseId, int moduleId, int lessonId, UpdateLessonProgressRequest request, CancellationToken cancellationToken)
    {
        if (!Enum.IsDefined(request.Progress))
        {
            return BadRequest(new
            {
                message = "Progresso inválido. Use NotStarted, InProgress ou Completed."
            });
        }

        var lesson = await dbContext.Lessons
            .FirstOrDefaultAsync(lesson => lesson.Id == lessonId
                && lesson.CourseModuleId == moduleId
                && lesson.Module!.CourseId == courseId
                && lesson.Module.Course!.UserId == userId, cancellationToken);
        if (lesson is null)
        {
            return NotFound(new
            {
                message = "Aula não encontrada."
            });
        }

        lesson.Progress = request.Progress;
        await dbContext.SaveChangesAsync(cancellationToken);
        var newAchievements = await achievements.AwardAsync(userId, cancellationToken);

        return Ok(new
        {
            lesson.Id,
            lesson.Progress,
            NewAchievements = newAchievements.Select(AchievementService.ToSummary)
        });
    }
}
