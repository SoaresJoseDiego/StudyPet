using StudyPet.Application;

namespace StudyPet.Application.Tests;

public class StudyRewardCalculatorTests
{
    private static readonly SlimeTally Reference = new(15, 6, 3, 1); // 210 Exp

    [Theory]
    [InlineData(false, false, 210)]
    [InlineData(true, false, 231)]  // 210 × 1,10
    [InlineData(false, true, 252)]  // 210 × 1,20
    [InlineData(true, true, 278)]   // 231 × 1,20 = 277,2 → 278
    public void Experience_is_the_sum_of_slimes_plus_bonuses(bool first, bool goal, int expected)
    {
        Assert.Equal(expected, StudyRewardCalculator.Calculate(Reference, 25, first, goal).Experience);
    }

    [Theory]
    [InlineData(1, 5)]
    [InlineData(30, 5)]
    [InlineData(31, 10)]
    [InlineData(60, 10)]
    [InlineData(61, 15)]
    [InlineData(90, 15)]
    [InlineData(91, 25)]
    public void Suggested_break_grows_with_focus_time(int minutes, int expectedBreak)
    {
        Assert.Equal(expectedBreak, StudyRewardCalculator.Calculate(SlimeTally.Empty, minutes, false, false).SuggestedBreakMinutes);
    }

    [Theory]
    [InlineData(1, 1)]
    [InlineData(25, 12)]
    [InlineData(60, 30)]
    public void Coins_are_half_the_minutes_with_a_minimum_of_one(int minutes, int expectedCoins)
    {
        Assert.Equal(expectedCoins, StudyRewardCalculator.Calculate(Reference, minutes, false, false).Coins);
    }

    [Fact]
    public void Nothing_studied_gives_nothing()
    {
        Assert.Equal(new StudyReward(0, 0, 0), StudyRewardCalculator.Calculate(SlimeTally.Empty, 0, true, true));
    }
}
