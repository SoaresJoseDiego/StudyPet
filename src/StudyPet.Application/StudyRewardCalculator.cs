namespace StudyPet.Application;

public sealed record StudyReward(int Experience, int Coins, int SuggestedBreakMinutes);

public static class StudyRewardCalculator
{
    public static StudyReward Calculate(int focusMinutes, bool firstSessionOfDay, bool dailyGoalReached)
    {
        if (focusMinutes <= 0) return new StudyReward(0, 0, 0);

        var experience = focusMinutes * 5;
        if (firstSessionOfDay) experience = (int)Math.Ceiling(experience * 1.10m);
        if (dailyGoalReached) experience = (int)Math.Ceiling(experience * 1.20m);

        var breakMinutes = focusMinutes switch { <= 30 => 5, <= 60 => 10, <= 90 => 15, _ => 25 };
        return new StudyReward(experience, Math.Max(1, focusMinutes / 2), breakMinutes);
    }
}
