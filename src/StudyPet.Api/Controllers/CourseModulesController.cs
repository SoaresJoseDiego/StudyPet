using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Courses;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users/{userId:int}/courses/{courseId:int}/modules")]
public sealed class CourseModulesController(StudyPetDbContext dbContext) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(int userId, int courseId, CreateCourseModuleRequest request, CancellationToken cancellationToken)
    {
        var title = CourseRules.Clean(request.Title, CourseRules.MaxTitleLength);
        if (title is null)
        {
            return BadRequest(new
            {
                message = "O título do módulo é obrigatório."
            });
        }

        var lessons = CourseRules.CleanTitles(request.Lessons);
        if (lessons.Count > CourseRules.MaxLessonsPerRequest)
        {
            return BadRequest(new
            {
                message = $"Cadastre no máximo {CourseRules.MaxLessonsPerRequest} aulas de uma vez."
            });
        }

        var courseExists = await dbContext.Courses
            .AnyAsync(course => course.Id == courseId && course.UserId == userId, cancellationToken);
        if (!courseExists)
        {
            return NotFound(new
            {
                message = "Curso não encontrado."
            });
        }

        var lastPosition = await dbContext.CourseModules
            .Where(module => module.CourseId == courseId)
            .Select(module => (int?)module.Position)
            .MaxAsync(cancellationToken) ?? 0;

        var module = new CourseModule
        {
            CourseId = courseId,
            Title = title,
            Position = lastPosition + 1,
            Lessons = lessons.Select((lesson, index) => new Lesson { Title = lesson, Position = index + 1 }).ToList()
        };

        dbContext.CourseModules.Add(module);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/users/{userId}/courses/{courseId}/modules/{module.Id}", new
        {
            module.Id,
            module.CourseId,
            module.Title,
            module.Position,
            Lessons = module.Lessons.Select(lesson => new { lesson.Id, lesson.Title, lesson.Position, lesson.Progress })
        });
    }
}
