namespace StudyPet.Api.StudySessions;

/// <param name="FocusSeconds">Segundos de foco medidos pelo front (sem as pausas).</param>
public sealed record FinishStudySessionRequest(int FocusSeconds, bool CompleteLesson = false);
