using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using StudyPet.Api.Achievements;
using StudyPet.Api.Courses;
using StudyPet.Domain;
using StudyPet.Infrastructure;

namespace StudyPet.Api.Controllers;

[ApiController]
[Route("api/users/{userId:int}/courses")]
public sealed class CoursesController(StudyPetDbContext dbContext, AchievementService achievements) : ControllerBase
{
    private const int MinWeeklyGoalMinutes = 10;
    private const int MaxWeeklyGoalMinutes = 3000;

    [HttpPost]
    public async Task<IActionResult> Create(int userId, CreateCourseRequest request, CancellationToken cancellationToken)
    {
        var title = CourseRules.Clean(request.Title, CourseRules.MaxTitleLength);
        if (title is null)
        {
            return BadRequest(new
            {
                message = "O título do curso é obrigatório."
            });
        }

        if (!CourseRules.IsValidCategory(request.Category) || !CourseRules.IsValidColor(request.Color))
        {
            return BadRequest(new
            {
                message = "Tipo ou cor do curso inválidos."
            });
        }

        if (request.WeeklyGoalMinutes is < MinWeeklyGoalMinutes or > MaxWeeklyGoalMinutes)
        {
            return BadRequest(new
            {
                message = $"A meta semanal deve ficar entre {MinWeeklyGoalMinutes} e {MaxWeeklyGoalMinutes} minutos."
            });
        }

        var modules = (request.Modules ?? [])
            .Select(module => new { Title = CourseRules.Clean(module.Title, CourseRules.MaxTitleLength), Lessons = CourseRules.CleanTitles(module.Lessons) })
            .Where(module => module.Title is not null)
            .ToList();

        if (modules.Sum(module => module.Lessons.Count) > CourseRules.MaxLessonsPerRequest)
        {
            return BadRequest(new
            {
                message = $"Cadastre no máximo {CourseRules.MaxLessonsPerRequest} aulas de uma vez."
            });
        }

        var userExists = await dbContext.Users.AnyAsync(user => user.Id == userId, cancellationToken);
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
            Category = request.Category ?? CourseCategory.CursoOnline,
            Color = request.Color ?? "verde",
            Instructor = CourseRules.Clean(request.Instructor, 120),
            Provider = CourseRules.Clean(request.Provider, 80),
            SourceUrl = CourseRules.Clean(request.SourceUrl, 500),
            WeeklyGoalMinutes = request.WeeklyGoalMinutes,
            Modules = modules.Select((module, moduleIndex) => new CourseModule
            {
                Title = module.Title!,
                Position = moduleIndex + 1,
                Lessons = module.Lessons.Select((lesson, lessonIndex) => new Lesson
                {
                    Title = lesson,
                    Position = lessonIndex + 1
                }).ToList()
            }).ToList()
        };

        dbContext.Courses.Add(course);
        await dbContext.SaveChangesAsync(cancellationToken);
        var newAchievements = await achievements.AwardAsync(userId, cancellationToken);

        return Created($"/api/users/{userId}/courses/{course.Id}", new
        {
            course.Id,
            course.UserId,
            course.Title,
            course.Category,
            course.Color,
            course.Instructor,
            course.Provider,
            course.SourceUrl,
            course.IsArchived,
            course.WeeklyGoalMinutes,
            Modules = course.Modules.Count,
            Lessons = course.Modules.Sum(module => module.Lessons.Count),
            NewAchievements = newAchievements.Select(AchievementService.ToSummary)
        });
    }

    /// <param name="status">andamento, concluidos, arquivados ou todos (padrão).</param>
    [HttpGet]
    public async Task<IActionResult> List(int userId, string? status = null, CancellationToken cancellationToken = default)
    {
        var userExists = await dbContext.Users.AnyAsync(user => user.Id == userId, cancellationToken);
        if (!userExists)
        {
            return NotFound(new
            {
                message = "Usuário não encontrado."
            });
        }

        var courses = await dbContext.Courses
            .AsNoTracking()
            .Where(course => course.UserId == userId)
            .OrderByDescending(course => course.CreatedAt)
            .Select(course => new
            {
                course.Id,
                course.Title,
                course.Category,
                course.Color,
                course.Instructor,
                course.Provider,
                course.SourceUrl,
                course.IsArchived,
                course.WeeklyGoalMinutes,
                TotalLessons = course.Modules.SelectMany(module => module.Lessons).Count(),
                CompletedLessons = course.Modules.SelectMany(module => module.Lessons)
                    .Count(lesson => lesson.Progress == LessonProgress.Completed),
                FocusMinutes = course.Modules.SelectMany(module => module.Lessons).SelectMany(lesson => lesson.Sessions)
                    .Where(session => session.Status == SessionStatus.Completed)
                    .Sum(session => session.FocusMinutes),
                NextLesson = course.Modules.OrderBy(module => module.Position)
                    .SelectMany(module => module.Lessons.OrderBy(lesson => lesson.Position))
                    .Where(lesson => lesson.Progress != LessonProgress.Completed)
                    .Select(lesson => new { lesson.Id, lesson.Title })
                    .FirstOrDefault()
            })
            .ToListAsync(cancellationToken);

        var withState = courses.Select(course => new
        {
            course.Id,
            course.Title,
            course.Category,
            course.Color,
            course.Instructor,
            course.Provider,
            course.SourceUrl,
            course.IsArchived,
            course.WeeklyGoalMinutes,
            course.TotalLessons,
            course.CompletedLessons,
            course.FocusMinutes,
            course.NextLesson,
            IsCompleted = course.TotalLessons > 0 && course.CompletedLessons == course.TotalLessons
        }).ToList();

        var filtered = status switch
        {
            "andamento" => withState.Where(course => !course.IsArchived && !course.IsCompleted),
            "concluidos" => withState.Where(course => course.IsCompleted),
            "arquivados" => withState.Where(course => course.IsArchived),
            _ => withState.Where(course => !course.IsArchived)
        };

        return Ok(new
        {
            Counts = new
            {
                InProgress = withState.Count(course => !course.IsArchived && !course.IsCompleted),
                Completed = withState.Count(course => course.IsCompleted),
                Archived = withState.Count(course => course.IsArchived),
                All = withState.Count(course => !course.IsArchived)
            },
            Items = filtered.ToList()
        });
    }

    [HttpGet("{courseId:int}")]
    public async Task<IActionResult> GetById(int userId, int courseId, CancellationToken cancellationToken)
    {
        var course = await dbContext.Courses
            .AsNoTracking()
            .Where(course => course.Id == courseId && course.UserId == userId)
            .Select(course => new
            {
                course.Id,
                course.UserId,
                course.Title,
                course.Category,
                course.Color,
                course.Instructor,
                course.Provider,
                course.SourceUrl,
                course.IsArchived,
                course.WeeklyGoalMinutes,
                Modules = course.Modules
                    .OrderBy(module => module.Position)
                    .Select(module => new
                    {
                        module.Id,
                        module.Title,
                        module.Position,
                        Lessons = module.Lessons
                            .OrderBy(lesson => lesson.Position)
                            .Select(lesson => new
                            {
                                lesson.Id,
                                lesson.Title,
                                lesson.Position,
                                lesson.Progress,
                                Sessions = lesson.Sessions.Count(session => session.Status == SessionStatus.Completed)
                            })
                            .ToList()
                    })
                    .ToList()
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (course is null)
        {
            return NotFound(new
            {
                message = "Curso não encontrado."
            });
        }

        var sessions = await dbContext.StudySessions
            .AsNoTracking()
            .Where(session => session.Status == SessionStatus.Completed && session.Lesson!.Module!.CourseId == courseId)
            .Select(session => new { session.FocusMinutes, session.EarnedExperience })
            .ToListAsync(cancellationToken);

        var notes = await dbContext.StudyNotes
            .AsNoTracking()
            .Where(note => note.CourseId == courseId)
            .OrderByDescending(note => note.CreatedAt)
            .Take(2)
            .Select(note => new { note.Id, note.CreatedAt, note.Minutes, note.Mood, note.Text })
            .ToListAsync(cancellationToken);

        var lessons = course.Modules.SelectMany(module => module.Lessons).ToList();
        var next = course.Modules
            .SelectMany(module => module.Lessons.Select(lesson => new { lesson.Id, lesson.Title, lesson.Progress }))
            .FirstOrDefault(lesson => lesson.Progress != LessonProgress.Completed);

        return Ok(new
        {
            course.Id,
            course.UserId,
            course.Title,
            course.Category,
            course.Color,
            course.Instructor,
            course.Provider,
            course.SourceUrl,
            course.IsArchived,
            course.WeeklyGoalMinutes,
            Stats = new
            {
                TotalLessons = lessons.Count,
                CompletedLessons = lessons.Count(lesson => lesson.Progress == LessonProgress.Completed),
                Sessions = sessions.Count,
                FocusMinutes = sessions.Sum(session => session.FocusMinutes),
                Experience = sessions.Sum(session => session.EarnedExperience)
            },
            NextLesson = next is null ? null : new { next.Id, next.Title },
            course.Modules,
            RecentNotes = notes
        });
    }

    [HttpPut("{courseId:int}")]
    public async Task<IActionResult> Update(int userId, int courseId, UpdateCourseRequest request, CancellationToken cancellationToken)
    {
        var title = CourseRules.Clean(request.Title, CourseRules.MaxTitleLength);
        if (title is null)
        {
            return BadRequest(new
            {
                message = "O título do curso é obrigatório."
            });
        }

        if (!CourseRules.IsValidCategory(request.Category) || !CourseRules.IsValidColor(request.Color))
        {
            return BadRequest(new
            {
                message = "Tipo ou cor do curso inválidos."
            });
        }

        var course = await dbContext.Courses
            .FirstOrDefaultAsync(course => course.Id == courseId && course.UserId == userId, cancellationToken);
        if (course is null)
        {
            return NotFound(new
            {
                message = "Curso não encontrado."
            });
        }

        course.Title = title;
        course.Category = request.Category ?? course.Category;
        course.Color = request.Color ?? course.Color;
        course.Instructor = CourseRules.Clean(request.Instructor, 120);
        course.Provider = CourseRules.Clean(request.Provider, 80);
        course.SourceUrl = CourseRules.Clean(request.SourceUrl, 500);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            course.Id,
            course.Title,
            course.Category,
            course.Color,
            course.Instructor,
            course.Provider,
            course.SourceUrl
        });
    }

    [HttpPut("{courseId:int}/archived")]
    public async Task<IActionResult> SetArchived(int userId, int courseId, SetCourseArchivedRequest request, CancellationToken cancellationToken)
    {
        var course = await dbContext.Courses
            .FirstOrDefaultAsync(course => course.Id == courseId && course.UserId == userId, cancellationToken);
        if (course is null)
        {
            return NotFound(new
            {
                message = "Curso não encontrado."
            });
        }

        course.IsArchived = request.IsArchived;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            course.Id,
            course.IsArchived
        });
    }

    [HttpPut("{courseId:int}/weekly-goal")]
    public async Task<IActionResult> SetWeeklyGoal(int userId, int courseId, SetWeeklyGoalRequest request, CancellationToken cancellationToken)
    {
        if (request.Minutes is < MinWeeklyGoalMinutes or > MaxWeeklyGoalMinutes)
        {
            return BadRequest(new
            {
                message = $"A meta semanal deve ficar entre {MinWeeklyGoalMinutes} e {MaxWeeklyGoalMinutes} minutos (ou vazia para remover)."
            });
        }

        var course = await dbContext.Courses
            .FirstOrDefaultAsync(course => course.Id == courseId && course.UserId == userId, cancellationToken);
        if (course is null)
        {
            return NotFound(new
            {
                message = "Curso não encontrado."
            });
        }

        course.WeeklyGoalMinutes = request.Minutes;
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            course.Id,
            course.WeeklyGoalMinutes
        });
    }
}
