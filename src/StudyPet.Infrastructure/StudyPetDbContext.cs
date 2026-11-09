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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasIndex(user => user.Email).IsUnique();
            entity.Property(user => user.DisplayName).HasMaxLength(80);
            entity.Property(user => user.Email).HasMaxLength(255);
            entity.HasOne(user => user.Character).WithOne(character => character.User)
                .HasForeignKey<StudyCharacter>(character => character.UserId);
        });

        modelBuilder.Entity<Course>(entity =>
        {
            entity.Property(course => course.Title).HasMaxLength(180);
            entity.HasOne(course => course.User).WithMany(user => user.Courses)
                .HasForeignKey(course => course.UserId);
        });

        modelBuilder.Entity<CourseModule>().HasOne(module => module.Course).WithMany(course => course.Modules)
            .HasForeignKey(module => module.CourseId);
        modelBuilder.Entity<Lesson>().HasOne(lesson => lesson.Module).WithMany(module => module.Lessons)
            .HasForeignKey(lesson => lesson.CourseModuleId);
        modelBuilder.Entity<StudySession>().HasOne(session => session.Lesson).WithMany(lesson => lesson.Sessions)
            .HasForeignKey(session => session.LessonId);
    }
}
