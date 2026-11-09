namespace StudyPet.Domain;

public sealed class User
{
    public int Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int DailyGoalMinutes { get; set; } = 60;
    /// <summary>Total de slimes já derrotados: define quando vem o próximo Slime Rei (a cada 60).</summary>
    public int SlimesDefeated { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public StudyCharacter? Character { get; set; }
    public List<Course> Courses { get; set; } = [];
    public List<StudySession> Sessions { get; set; } = [];
    public List<StudyNote> Notes { get; set; } = [];
    public List<UserAchievement> Achievements { get; set; } = [];
}

public sealed class StudyCharacter
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Name { get; set; } = "Pip";
    public int Level { get; set; } = 1;
    public int Experience { get; set; }
    public int Coins { get; set; }
    public User? User { get; set; }
}

public sealed class Course
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public CourseCategory Category { get; set; } = CourseCategory.CursoOnline;
    /// <summary>Cor do card (chave da paleta do front: verde, azul, pessego, lilas).</summary>
    public string Color { get; set; } = "verde";
    public string? Instructor { get; set; }
    public string? Provider { get; set; }
    /// <summary>Link do curso na plataforma (ex.: página da Udemy), só para referência.</summary>
    public string? SourceUrl { get; set; }
    public bool IsArchived { get; set; }
    /// <summary>Meta semanal de estudo deste curso, em minutos (opcional).</summary>
    public int? WeeklyGoalMinutes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public User? User { get; set; }
    public List<CourseModule> Modules { get; set; } = [];
    public List<StudyNote> Notes { get; set; } = [];
}

public sealed class CourseModule
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }
    public Course? Course { get; set; }
    public List<Lesson> Lessons { get; set; } = [];
}

public sealed class Lesson
{
    public int Id { get; set; }
    public int CourseModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }
    public LessonProgress Progress { get; set; } = LessonProgress.NotStarted;
    public CourseModule? Module { get; set; }
    public List<StudySession> Sessions { get; set; } = [];
}

public sealed class StudySession
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int LessonId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public int PlannedMinutes { get; set; }
    public int FocusSeconds { get; set; }
    public int FocusMinutes { get; set; }
    public int BreakMinutes { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.InProgress;
    /// <summary>Semente das waves de slimes desta sessão (o front e a API sorteiam igual).</summary>
    public int Seed { get; set; }
    /// <summary>Quantos slimes o usuário já tinha derrotado quando a sessão começou.</summary>
    public int SlimeStartIndex { get; set; }
    public int SlimesLilas { get; set; }
    public int SlimesAzul { get; set; }
    public int SlimesRosa { get; set; }
    public int SlimesRei { get; set; }
    public int EarnedExperience { get; set; }
    public int EarnedCoins { get; set; }
    public User? User { get; set; }
    public Lesson? Lesson { get; set; }
}

/// <summary>Registro do diário de estudos.</summary>
public sealed class StudyNote
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public int CourseId { get; set; }
    public int? StudySessionId { get; set; }
    public int Minutes { get; set; }
    public StudyMood Mood { get; set; } = StudyMood.Ok;
    public string Text { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public User? User { get; set; }
    public Course? Course { get; set; }
}

public sealed class UserAchievement
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Key { get; set; } = string.Empty;
    public DateTimeOffset EarnedAt { get; set; } = DateTimeOffset.UtcNow;
    public User? User { get; set; }
}

public enum LessonProgress { NotStarted, InProgress, Completed }
public enum SessionStatus { InProgress, Completed, Cancelled }
public enum CourseCategory { Faculdade, CursoOnline, Cursinho, Livro, Outro }
public enum StudyMood { Facil, Ok, Dificil }
