namespace StudyPet.Application;

public static class DailyGoal
{
    public const int MinGoalMinutes = 5;
    public const int MaxGoalMinutes = 600;

    /// <summary>
    /// O bônus de meta diária vale uma vez por dia: só para a sessão que faz
    /// o total do dia cruzar a meta. Sessões seguintes no mesmo dia não recebem.
    /// </summary>
    public static bool IsCompletedBy(int minutesBeforeSession, int sessionMinutes, int goalMinutes) =>
        goalMinutes > 0
        && minutesBeforeSession < goalMinutes
        && minutesBeforeSession + sessionMinutes >= goalMinutes;
}
