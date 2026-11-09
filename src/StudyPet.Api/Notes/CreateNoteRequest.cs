using StudyPet.Domain;

namespace StudyPet.Api.Notes;

public sealed record CreateNoteRequest(int CourseId, int Minutes, StudyMood? Mood, string Text, int? StudySessionId);
