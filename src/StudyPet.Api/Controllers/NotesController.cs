using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Achievements;
using StudyPet.Api.Notes;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

/// <summary>Registro de estudos: o diário do que foi aprendido e onde travou.</summary>
[ApiController]
[Route("api/users/{userId:int}/notes")]
public sealed class NotesController(StudyPetDbContext dbContext, AchievementService achievements) : ControllerBase
{
    private const int MaxTextLength = 2000;

    [HttpGet]
    public async Task<IActionResult> List(int userId, int? courseId = null, int take = 50, CancellationToken cancellationToken = default)
    {
        take = Math.Clamp(take, 1, 200);

        var query = dbContext.StudyNotes.AsNoTracking().Where(note => note.UserId == userId);
        var total = await query.CountAsync(cancellationToken);
        if (courseId is not null) query = query.Where(note => note.CourseId == courseId);

        var items = await query
            .OrderByDescending(note => note.CreatedAt)
            .Take(take)
            .Select(note => new
            {
                note.Id,
                note.CourseId,
                CourseTitle = note.Course!.Title,
                CourseColor = note.Course.Color,
                note.StudySessionId,
                note.Minutes,
                note.Mood,
                note.Text,
                note.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            Total = total,
            Items = items
        });
    }

    [HttpPost]
    public async Task<IActionResult> Create(int userId, CreateNoteRequest request, CancellationToken cancellationToken)
    {
        var text = request.Text?.Trim();
        if (string.IsNullOrWhiteSpace(text))
        {
            return BadRequest(new
            {
                message = "Escreva o que você estudou."
            });
        }

        if (text.Length > MaxTextLength)
        {
            return BadRequest(new
            {
                message = $"O registro pode ter no máximo {MaxTextLength} caracteres."
            });
        }

        if (request.Minutes is < 0 or > 600 || (request.Mood is not null && !Enum.IsDefined(request.Mood.Value)))
        {
            return BadRequest(new
            {
                message = "Tempo ou humor inválidos."
            });
        }

        var course = await dbContext.Courses
            .AsNoTracking()
            .Where(course => course.Id == request.CourseId && course.UserId == userId)
            .Select(course => new { course.Id, course.Title, course.Color })
            .FirstOrDefaultAsync(cancellationToken);
        if (course is null)
        {
            return NotFound(new
            {
                message = "Curso não encontrado."
            });
        }

        if (request.StudySessionId is not null)
        {
            var sessionOk = await dbContext.StudySessions.AnyAsync(session => session.Id == request.StudySessionId
                && session.UserId == userId, cancellationToken);
            if (!sessionOk)
            {
                return NotFound(new
                {
                    message = "Sessão de estudo não encontrada."
                });
            }
        }

        var note = new StudyNote
        {
            UserId = userId,
            CourseId = course.Id,
            StudySessionId = request.StudySessionId,
            Minutes = request.Minutes,
            Mood = request.Mood ?? StudyMood.Ok,
            Text = text
        };

        dbContext.StudyNotes.Add(note);
        await dbContext.SaveChangesAsync(cancellationToken);
        var newAchievements = await achievements.AwardAsync(userId, cancellationToken);

        return Created($"/api/users/{userId}/notes/{note.Id}", new
        {
            note.Id,
            note.CourseId,
            CourseTitle = course.Title,
            CourseColor = course.Color,
            note.StudySessionId,
            note.Minutes,
            note.Mood,
            note.Text,
            note.CreatedAt,
            NewAchievements = newAchievements.Select(AchievementService.ToSummary)
        });
    }
}
