using StudyPet.Domain;

namespace StudyPet.Api.Courses;

public sealed record CreateCourseRequest(
    string Title,
    CourseCategory? Category,
    string? Color,
    string? Instructor,
    string? Provider,
    string? SourceUrl,
    int? WeeklyGoalMinutes,
    IReadOnlyList<NewModuleRequest>? Modules);

/// <summary>Módulo criado junto com o curso, com as aulas já listadas (uma por item).</summary>
public sealed record NewModuleRequest(string Title, IReadOnlyList<string>? Lessons);
