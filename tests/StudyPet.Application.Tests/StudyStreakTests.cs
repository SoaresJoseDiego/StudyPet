using StudyPet.Application;

namespace StudyPet.Application.Tests;

public class StudyStreakTests
{
    private static readonly DateOnly Today = new(2026, 11, 9);

    private static DateOnly[] DaysAgo(params int[] offsets) =>
        offsets.Select(offset => Today.AddDays(-offset)).ToArray();

    [Fact]
    public void No_days_means_no_streak()
    {
        Assert.Equal(new StreakResult(0, 0), StudyStreak.Calculate([], Today));
    }

    [Fact]
    public void Consecutive_days_ending_today()
    {
        Assert.Equal(new StreakResult(3, 3), StudyStreak.Calculate(DaysAgo(0, 1, 2), Today));
    }

    [Fact]
    public void Streak_survives_until_today_ends()
    {
        Assert.Equal(new StreakResult(2, 2), StudyStreak.Calculate(DaysAgo(1, 2), Today));
    }

    [Fact]
    public void Streak_breaks_after_a_missed_day()
    {
        Assert.Equal(new StreakResult(0, 2), StudyStreak.Calculate(DaysAgo(2, 3), Today));
    }

    [Fact]
    public void Longest_is_kept_after_a_break_and_duplicates_count_once()
    {
        var days = DaysAgo(0, 0, 1, 5, 6, 7, 8);
        Assert.Equal(new StreakResult(2, 4), StudyStreak.Calculate(days, Today));
    }
}
