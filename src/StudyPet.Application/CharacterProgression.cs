namespace StudyPet.Application;

/// <summary>
/// Curva do design "Sistema de Exp": subir do nível N para o N+1 custa 20 × N^1,35 Exp,
/// arredondado para múltiplos de 5 (nível 1: 20, nível 10: 450, nível 49: 3.825).
/// Broto (nível 10) pede 1.685 Exp no total; Florescido (nível 50), 81.725.
/// </summary>
public static class CharacterProgression
{
    public const int MaxLevel = 200;

    private static readonly int[] TotalToReach = BuildTable();

    private static int[] BuildTable()
    {
        var table = new int[MaxLevel + 2];
        for (var level = 2; level <= MaxLevel + 1; level++)
            table[level] = table[level - 1] + StepCost(level - 1);
        return table;
    }

    /// <summary>Exp para ir do nível <paramref name="level"/> ao seguinte.</summary>
    public static int StepCost(int level) =>
        (int)(Math.Round(20 * Math.Pow(level, 1.35) / 5, MidpointRounding.AwayFromZero) * 5);

    public static int ExperienceToReach(int level) =>
        level <= 1 ? 0 : TotalToReach[Math.Min(level, MaxLevel + 1)];

    public static int LevelFor(int totalExperience)
    {
        var level = 1;
        while (level < MaxLevel && totalExperience >= ExperienceToReach(level + 1)) level++;
        return level;
    }

    /// <summary>Formas do pet (design "Pet de Estudos"): a forma muda ao atingir o nível mínimo.</summary>
    public static readonly IReadOnlyList<PetStage> Stages =
    [
        new(1, "Semente", 1),
        new(2, "Broto", 10),
        new(3, "Muda", 25),
        new(4, "Florescido", 50)
    ];

    public static PetStage StageFor(int level) => Stages.Last(stage => level >= stage.MinLevel);

    public static PetStage? NextStageAfter(PetStage stage) =>
        Stages.FirstOrDefault(next => next.Number == stage.Number + 1);
}

public sealed record PetStage(int Number, string Name, int MinLevel);
