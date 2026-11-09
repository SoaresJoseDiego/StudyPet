namespace StudyPet.Application;

public sealed record StudyReward(int Experience, int Coins, int SuggestedBreakMinutes);

public static class StudyRewardCalculator
{
    /// <summary>
    /// Exp base = soma dos slimes derrotados (ver <see cref="Slimes"/>), com bônus de
    /// +10% na primeira sessão do dia e +20% na sessão que completa a meta diária.
    /// </summary>
    public static StudyReward Calculate(SlimeTally slimes, int focusMinutes, bool firstSessionOfDay, bool dailyGoalReached)
    {
        if (focusMinutes <= 0 && slimes.Total == 0) return new StudyReward(0, 0, 0);

        var experience = slimes.Experience;
        if (firstSessionOfDay) experience = (int)Math.Ceiling(experience * 1.10m);
        if (dailyGoalReached) experience = (int)Math.Ceiling(experience * 1.20m);

        var breakMinutes = focusMinutes switch { <= 30 => 5, <= 60 => 10, <= 90 => 15, _ => 25 };
        return new StudyReward(experience, Math.Max(1, focusMinutes / 2), breakMinutes);
    }
}
