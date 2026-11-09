namespace StudyPet.Api.Courses;

public sealed record CreateCourseModuleRequest(string Title, IReadOnlyList<string>? Lessons);
