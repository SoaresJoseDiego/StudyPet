namespace StudyPet.Application;

public sealed record StreakResult(int Current, int Longest);

public static class StudyStreak
{
    /// <summary>
    /// Sequência de dias seguidos com pelo menos uma sessão concluída.
    /// A sequência atual continua viva se o último dia de estudo foi hoje ou ontem
    /// (quem ainda não estudou hoje não perde a sequência antes do dia acabar).
    /// </summary>
    public static StreakResult Calculate(IEnumerable<DateOnly> studyDays, DateOnly today)
    {
        var days = studyDays.Distinct().OrderBy(day => day).ToList();
        if (days.Count == 0) return new StreakResult(0, 0);

        var longest = 1;
        var run = 1;
        for (var i = 1; i < days.Count; i++)
        {
            run = days[i].DayNumber - days[i - 1].DayNumber == 1 ? run + 1 : 1;
            longest = Math.Max(longest, run);
        }

        var last = days[^1];
        var current = today.DayNumber - last.DayNumber <= 1 ? run : 0;
        return new StreakResult(current, longest);
    }
}
