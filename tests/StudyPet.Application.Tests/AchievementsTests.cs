using StudyPet.Application;

namespace StudyPet.Application.Tests;

public class AchievementsTests
{
    [Fact]
    public void There_are_18_achievements_in_6_groups_with_unique_keys()
    {
        Assert.Equal(18, Achievements.All.Count);
        Assert.Equal(6, Achievements.All.Select(a => a.Group).Distinct().Count());
        Assert.Equal(18, Achievements.All.Select(a => a.Key).Distinct().Count());
    }

    [Fact]
    public void Newly_earned_skips_already_earned_and_unmet()
    {
        var progress = new AchievementProgress(LongestStreak: 7, KingSlimes: 0, FocusMinutes: 600, Level: 10,
            CoursesAdded: 1, CoursesCompleted: 0, Notes: 0);

        var keys = Achievements.NewlyEarned(progress, new HashSet<string> { "streak-3" }).Select(a => a.Key).ToList();

        Assert.Equal(["streak-7", "hours-10", "stage-broto", "course-1"], keys);
    }
}
