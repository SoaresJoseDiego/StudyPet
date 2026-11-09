namespace StudyPet.Domain;

public sealed class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public StudyCharacter? Character { get; set; }
    public List<Course> Courses { get; set; } = [];
}

public sealed class StudyCharacter
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Name { get; set; } = "Pip";
    public int Level { get; set; } = 1;
    public int Experience { get; set; }
    public int Coins { get; set; }
    public User? User { get; set; }
}

public sealed class Course
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Instructor { get; set; }
    public string? Provider { get; set; }
    public bool IsArchived { get; set; }
    public User? User { get; set; }
    public List<CourseModule> Modules { get; set; } = [];
}

public sealed class CourseModule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CourseId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }
    public Course? Course { get; set; }
    public List<Lesson> Lessons { get; set; } = [];
}

public sealed class Lesson
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CourseModuleId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Position { get; set; }
    public LessonProgress Progress { get; set; } = LessonProgress.NotStarted;
    public CourseModule? Module { get; set; }
    public List<StudySession> Sessions { get; set; } = [];
}

public sealed class StudySession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid LessonId { get; set; }
    public DateTimeOffset StartedAt { get; set; }
    public DateTimeOffset? FinishedAt { get; set; }
    public int PlannedMinutes { get; set; }
    public int FocusMinutes { get; set; }
    public int BreakMinutes { get; set; }
    public SessionStatus Status { get; set; } = SessionStatus.InProgress;
    public int EarnedExperience { get; set; }
    public int EarnedCoins { get; set; }
    public Lesson? Lesson { get; set; }
}

public enum LessonProgress { NotStarted, InProgress, Completed }
public enum SessionStatus { InProgress, Completed, Cancelled }
