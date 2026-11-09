using StudyPet.Domain;

namespace StudyPet.Api.Courses;

public sealed record UpdateCourseRequest(
    string Title,
    CourseCategory? Category,
    string? Color,
    string? Instructor,
    string? Provider,
    string? SourceUrl);
