namespace StudyPet.Api.Courses;

public sealed record CreateCourseRequest(
    string Title,
    string? Instructor,
    string? Provider);
