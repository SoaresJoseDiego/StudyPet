namespace StudyPet.Api.StudySessions;

/// <summary>
/// Datas do calendário de estudo. Por enquanto o "dia" é o dia em UTC;
/// quando o usuário tiver fuso horário, calcular a partir dele.
/// </summary>
public static class StudyDay
{
    public static DateOnly Today() => DateOnly.FromDateTime(DateTime.UtcNow);

    public static DateOnly DayOf(DateTimeOffset moment) => DateOnly.FromDateTime(moment.UtcDateTime);

    public static DateTimeOffset StartOf(DateOnly day) => new(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);

    public static DateTimeOffset StartOfToday() => StartOf(Today());

    /// <summary>Segunda-feira da semana atual.</summary>
    public static DateOnly StartOfWeek()
    {
        var today = Today();
        var daysSinceMonday = ((int)today.DayOfWeek + 6) % 7;
        return today.AddDays(-daysSinceMonday);
    }
}
