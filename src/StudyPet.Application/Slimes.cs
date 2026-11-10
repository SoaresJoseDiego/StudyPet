namespace StudyPet.Application;

public enum SlimeKind { Lilas, Azul, Rosa, Rei }

public sealed record SlimeInfo(SlimeKind Kind, string Name, int Experience, string Rarity);

/// <summary>Um slime de uma wave: quando ele é derrotado (em ms de foco) e qual o seu número total.</summary>
public sealed record SlimeSpawn(int Wave, int IndexInWave, SlimeKind Kind, int Number, int DeathMs);

public sealed record SlimeTally(int Lilas, int Azul, int Rosa, int Rei)
{
    public static readonly SlimeTally Empty = new(0, 0, 0, 0);

    public int Total => Lilas + Azul + Rosa + Rei;

    public int Experience =>
        Lilas * Slimes.Info[SlimeKind.Lilas].Experience
        + Azul * Slimes.Info[SlimeKind.Azul].Experience
        + Rosa * Slimes.Info[SlimeKind.Rosa].Experience
        + Rei * Slimes.Info[SlimeKind.Rei].Experience;

    public int CountOf(SlimeKind kind) => kind switch
    {
        SlimeKind.Lilas => Lilas,
        SlimeKind.Azul => Azul,
        SlimeKind.Rosa => Rosa,
        _ => Rei
    };

    public static SlimeTally operator +(SlimeTally a, SlimeTally b) =>
        new(a.Lilas + b.Lilas, a.Azul + b.Azul, a.Rosa + b.Rosa, a.Rei + b.Rei);
}

/// <summary>
/// Waves de slimes (design "Pet de Estudos" + regras de aparição):
/// <list type="bullet">
/// <item>waves sempre de 4 slimes, a cada 4 minutos de foco: um slime derrotado por minuto, e a próxima wave
/// entra quando o último da anterior cai, então a cena nunca fica vazia;</item>
/// <item>cada slime é Lilás (60%), Azul (28%) ou Rosado (12%);</item>
/// <item>todo 60º slime derrotado pelo usuário (contando todas as sessões) é um Slime Rei.</item>
/// </list>
/// O sorteio usa a semente da sessão (mulberry32), idêntico ao do front (web/src/slimes.ts),
/// então a API recalcula exatamente os slimes que a tela mostrou.
/// </summary>
public static class Slimes
{
    public const int KingEvery = 60;
    public const int WaveSize = 4;
    public const int WaveMs = 240_000;

    public static readonly IReadOnlyDictionary<SlimeKind, SlimeInfo> Info = new Dictionary<SlimeKind, SlimeInfo>
    {
        [SlimeKind.Lilas] = new(SlimeKind.Lilas, "Slime Lilás", 5, "Comum"),
        [SlimeKind.Azul] = new(SlimeKind.Azul, "Slime Azul", 10, "Incomum"),
        [SlimeKind.Rosa] = new(SlimeKind.Rosa, "Slime Rosado", 15, "Raro"),
        [SlimeKind.Rei] = new(SlimeKind.Rei, "Slime Rei", 30, "Chefe")
    };

    /// <summary>Todos os slimes das waves que começam antes de <paramref name="untilMs"/>.</summary>
    public static IReadOnlyList<SlimeSpawn> Generate(int seed, int startIndex, int untilMs)
    {
        var random = new Mulberry32(seed);
        var spawns = new List<SlimeSpawn>();
        var number = startIndex;

        for (var wave = 0; wave * WaveMs < untilMs; wave++)
        {
            for (var index = 0; index < WaveSize; index++)
            {
                number++;
                var kindRoll = random.Next(); // sorteado sempre, para a sequência não depender do Rei
                var kind = number % KingEvery == 0
                    ? SlimeKind.Rei
                    : kindRoll < 0.60 ? SlimeKind.Lilas : kindRoll < 0.88 ? SlimeKind.Azul : SlimeKind.Rosa;
                var deathMs = wave * WaveMs + WaveMs * (index + 1) / WaveSize;
                spawns.Add(new SlimeSpawn(wave, index, kind, number, deathMs));
            }
        }

        return spawns;
    }

    /// <summary>Slimes derrotados em <paramref name="focusSeconds"/> segundos de foco.</summary>
    public static SlimeTally Tally(int seed, int startIndex, int focusSeconds)
    {
        if (focusSeconds <= 0) return SlimeTally.Empty;

        var focusMs = focusSeconds * 1000;
        int lilas = 0, azul = 0, rosa = 0, rei = 0;
        foreach (var spawn in Generate(seed, startIndex, focusMs))
        {
            if (spawn.DeathMs > focusMs) continue;
            switch (spawn.Kind)
            {
                case SlimeKind.Lilas: lilas++; break;
                case SlimeKind.Azul: azul++; break;
                case SlimeKind.Rosa: rosa++; break;
                default: rei++; break;
            }
        }

        return new SlimeTally(lilas, azul, rosa, rei);
    }

    /// <summary>Gerador mulberry32: mesmo algoritmo e mesma sequência que o front.</summary>
    public sealed class Mulberry32(int seed)
    {
        private uint _state = unchecked((uint)seed);

        public double Next()
        {
            unchecked
            {
                _state += 0x6D2B79F5;
                var t = _state;
                t = (t ^ (t >> 15)) * (t | 1);
                t ^= t + (t ^ (t >> 7)) * (t | 61);
                return (t ^ (t >> 14)) / 4294967296.0;
            }
        }
    }
}
