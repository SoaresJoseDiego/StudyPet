namespace StudyPet.Api.Courses;

/// <summary>Várias aulas de uma vez (ex.: lista colada da plataforma, uma por linha).</summary>
public sealed record CreateLessonsRequest(IReadOnlyList<string> Titles);
