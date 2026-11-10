using Microsoft.EntityFrameworkCore;
using StudyPet.Domain;

namespace StudyPet.Infrastructure;

public sealed class StudyPetDbContext(DbContextOptions<StudyPetDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<StudyCharacter> Characters => Set<StudyCharacter>();
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseModule> CourseModules => Set<CourseModule>();
    public DbSet<Lesson> Lessons => Set<Lesson>();
    public DbSet<StudySession> StudySessions => Set<StudySession>();
    public DbSet<StudyNote> StudyNotes => Set<StudyNote>();
    public DbSet<UserAchievement> UserAchievements => Set<UserAchievement>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.DisplayName).HasMaxLength(80);
            entity.Property(user => user.Email).HasMaxLength(255);
            entity.Property(user => user.PasswordHash).HasMaxLength(256);
            entity.HasOne(user => user.Character).WithOne(character => character.User)
                .HasForeignKey<StudyCharacter>(character => character.UserId);
        });

        modelBuilder.Entity<StudyCharacter>().Property(character => character.Name).HasMaxLength(40);

        modelBuilder.Entity<Course>(entity =>
        {
            entity.Property(course => course.Title).HasMaxLength(180);
            entity.Property(course => course.Color).HasMaxLength(20);
            entity.Property(course => course.Instructor).HasMaxLength(120);
            entity.Property(course => course.Provider).HasMaxLength(80);
            entity.Property(course => course.SourceUrl).HasMaxLength(500);
            entity.Property(course => course.Category).HasConversion<string>().HasMaxLength(20);
            entity.HasOne(course => course.User).WithMany(user => user.Courses)
                .HasForeignKey(course => course.UserId);
        });

        modelBuilder.Entity<CourseModule>(entity =>
        {
            entity.Property(module => module.Title).HasMaxLength(180);
            entity.HasOne(module => module.Course).WithMany(course => course.Modules)
                .HasForeignKey(module => module.CourseId);
        });

        modelBuilder.Entity<Lesson>(entity =>
        {
            entity.Property(lesson => lesson.Title).HasMaxLength(180);
            entity.HasOne(lesson => lesson.Module).WithMany(module => module.Lessons)
                .HasForeignKey(lesson => lesson.CourseModuleId);
        });

        modelBuilder.Entity<StudySession>(entity =>
        {
            entity.HasOne(session => session.Lesson).WithMany(lesson => lesson.Sessions)
                .HasForeignKey(session => session.LessonId);
            entity.HasOne(session => session.User).WithMany(user => user.Sessions)
                .HasForeignKey(session => session.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            // No máximo uma sessão em andamento por usuário (Status 0 = InProgress).
            entity.HasIndex(session => session.UserId)
                .IsUnique()
                .HasFilter($"\"{nameof(StudySession.Status)}\" = {(int)SessionStatus.InProgress}")
                .HasDatabaseName("IX_StudySessions_UserId_InProgress");
            entity.HasIndex(session => new { session.UserId, session.FinishedAt });
        });

        modelBuilder.Entity<StudyNote>(entity =>
        {
            entity.Property(note => note.Text).HasMaxLength(2000);
            entity.Property(note => note.Mood).HasConversion<string>().HasMaxLength(10);
            entity.HasOne(note => note.User).WithMany(user => user.Notes)
                .HasForeignKey(note => note.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(note => note.Course).WithMany(course => course.Notes)
                .HasForeignKey(note => note.CourseId);
            entity.HasIndex(note => new { note.UserId, note.CreatedAt });
        });

        modelBuilder.Entity<UserAchievement>(entity =>
        {
            entity.Property(achievement => achievement.Key).HasMaxLength(40);
            entity.HasIndex(achievement => new { achievement.UserId, achievement.Key }).IsUnique();
            entity.HasOne(achievement => achievement.User).WithMany(user => user.Achievements)
                .HasForeignKey(achievement => achievement.UserId);
        });
    }
}
