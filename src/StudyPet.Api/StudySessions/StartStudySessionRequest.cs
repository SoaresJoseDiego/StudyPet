namespace StudyPet.Api.StudySessions;

public sealed record StartStudySessionRequest(int LessonId, int? PlannedMinutes);
