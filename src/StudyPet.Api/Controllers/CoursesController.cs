using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Courses;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users/{userId:guid}/courses")]
public sealed class CoursesController(StudyPetDbContext dbContext) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Create(
        Guid userId,
        CreateCourseRequest request,
        CancellationToken cancellationToken)
    {
        var title = request.Title.Trim();
        var instructor = request.Instructor?.Trim();
        var provider = request.Provider?.Trim();

        if (string.IsNullOrWhiteSpace(title))
        {
            return BadRequest(new
            {
                message = "O título do curso é obrigatório."
            });
        }

        var userExists = await dbContext.Users
            .AnyAsync(user => user.Id == userId, cancellationToken);

        if (!userExists)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        var course = new Course
        {
            UserId = userId,
            Title = title,
            Instructor = instructor,
            Provider = provider
        };

        dbContext.Courses.Add(course);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Created($"/api/users/{userId}/courses/{course.Id}", new
        {
            course.Id,
            course.UserId,
            course.Title,
            course.Instructor,
            course.Provider,
            course.IsArchived
        });
    }
}