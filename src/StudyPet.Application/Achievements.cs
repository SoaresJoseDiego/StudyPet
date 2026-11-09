namespace StudyPet.Application;

public enum AchievementMetric { LongestStreak, KingSlimes, FocusHours, Level, CoursesAdded, CoursesCompleted, Notes }

public sealed record AchievementDefinition(
    string Key,
    string Group,
    string Icon,
    string Name,
    string Description,
    AchievementMetric Metric,
    int Target);

/// <summary>Os números do usuário que as conquistas medem.</summary>
public sealed record AchievementProgress(
    int LongestStreak,
    int KingSlimes,
    int FocusMinutes,
    int Level,
    int CoursesAdded,
    int CoursesCompleted,
    int Notes)
{
    public int ValueOf(AchievementMetric metric) => metric switch
    {
        AchievementMetric.LongestStreak => LongestStreak,
        AchievementMetric.KingSlimes => KingSlimes,
        AchievementMetric.FocusHours => FocusMinutes / 60,
        AchievementMetric.Level => Level,
        AchievementMetric.CoursesAdded => CoursesAdded,
        AchievementMetric.CoursesCompleted => CoursesCompleted,
        _ => Notes
    };
}

/// <summary>As 18 conquistas do design "Pet de Estudos" (tela Conquistas), em 6 grupos.</summary>
public static class Achievements
{
    public static readonly IReadOnlyList<AchievementDefinition> All =
    [
        new("streak-3", "Constância", "flame", "Primeiros passos", "Estude 3 dias seguidos", AchievementMetric.LongestStreak, 3),
        new("streak-7", "Constância", "flame", "Semana firme", "Estude 7 dias seguidos", AchievementMetric.LongestStreak, 7),
        new("streak-30", "Constância", "flame", "Mês de ferro", "Estude 30 dias seguidos", AchievementMetric.LongestStreak, 30),
        new("king-1", "Chefes", "crown", "Coroa caída", "Derrote o primeiro Slime Rei", AchievementMetric.KingSlimes, 1),
        new("king-50", "Chefes", "crown", "Caçador de reis", "Derrote 50 Slimes Rei", AchievementMetric.KingSlimes, 50),
        new("king-500", "Chefes", "crown", "Fim da monarquia", "Derrote 500 Slimes Rei", AchievementMetric.KingSlimes, 500),
        new("hours-10", "Horas de estudo", "clock", "10 horas", "Some 10 horas de sessões", AchievementMetric.FocusHours, 10),
        new("hours-50", "Horas de estudo", "clock", "50 horas", "Some 50 horas de sessões", AchievementMetric.FocusHours, 50),
        new("hours-100", "Horas de estudo", "clock", "100 horas", "Some 100 horas de sessões", AchievementMetric.FocusHours, 100),
        new("stage-broto", "Evolução", "leaf", "Brotou!", "Seu pet chega ao Broto (nível 10)", AchievementMetric.Level, 10),
        new("stage-muda", "Evolução", "leaf", "Virou muda", "Seu pet chega à Muda (nível 25)", AchievementMetric.Level, 25),
        new("stage-florescido", "Evolução", "leaf", "Florescer", "Seu pet chega ao Florescido (nível 50)", AchievementMetric.Level, 50),
        new("course-1", "Cursos", "book", "Matrícula feita", "Adicione seu primeiro curso", AchievementMetric.CoursesAdded, 1),
        new("course-done-1", "Cursos", "book", "Formado", "Conclua um curso inteiro", AchievementMetric.CoursesCompleted, 1),
        new("course-done-5", "Cursos", "book", "Colecionador", "Conclua 5 cursos", AchievementMetric.CoursesCompleted, 5),
        new("notes-1", "Registros", "pencil", "Querido diário", "Escreva seu primeiro registro", AchievementMetric.Notes, 1),
        new("notes-10", "Registros", "pencil", "Caderno cheio", "Escreva 10 registros", AchievementMetric.Notes, 10),
        new("notes-50", "Registros", "pencil", "Escritor", "Escreva 50 registros", AchievementMetric.Notes, 50)
    ];

    /// <summary>Conquistas atingidas pelo progresso e que ainda não estavam em <paramref name="alreadyEarned"/>.</summary>
    public static IReadOnlyList<AchievementDefinition> NewlyEarned(AchievementProgress progress, IReadOnlySet<string> alreadyEarned) =>
        All.Where(definition => !alreadyEarned.Contains(definition.Key)
                && progress.ValueOf(definition.Metric) >= definition.Target)
            .ToList();
}
