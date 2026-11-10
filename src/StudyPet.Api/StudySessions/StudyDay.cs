namespace StudyPet.Api.StudySessions;

/// <summary>
/// Datas do calendário de estudo. Por enquanto o "dia" segue o horário de Brasília;
/// quando o usuário tiver fuso horário, calcular a partir dele.
/// </summary>
public static class StudyDay
{
    private static readonly TimeZoneInfo Zone = TimeZoneInfo.FindSystemTimeZoneById("America/Sao_Paulo");

    public static DateOnly Today() => DayOf(DateTimeOffset.UtcNow);

    public static DateOnly DayOf(DateTimeOffset moment) => DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(moment, Zone).DateTime);

    /// <summary>Meia-noite do dia, em UTC (o Npgsql só aceita offset zero em timestamptz).</summary>
    public static DateTimeOffset StartOf(DateOnly day)
    {
        var midnight = day.ToDateTime(TimeOnly.MinValue);
        return new DateTimeOffset(midnight, Zone.GetUtcOffset(midnight)).ToUniversalTime();
    }

    public static DateTimeOffset StartOfToday() => StartOf(Today());

    /// <summary>Segunda-feira da semana atual.</summary>
    public static DateOnly StartOfWeek()
    {
        var today = Today();
        var daysSinceMonday = ((int)today.DayOfWeek + 6) % 7;
        return today.AddDays(-daysSinceMonday);
    }
}
