using StudyPet.Application;

namespace StudyPet.Application.Tests;

public class SlimesTests
{
    [Fact]
    public void Same_seed_generates_the_same_waves()
    {
        var a = Slimes.Generate(seed: 42, startIndex: 0, untilMs: 30 * 60_000);
        var b = Slimes.Generate(seed: 42, startIndex: 0, untilMs: 30 * 60_000);

        Assert.Equal(a, b);
        Assert.NotEqual(a, Slimes.Generate(seed: 43, startIndex: 0, untilMs: 30 * 60_000));
    }

    [Fact]
    public void Waves_have_one_to_three_slimes_and_all_die_inside_their_wave()
    {
        var spawns = Slimes.Generate(seed: 7, startIndex: 0, untilMs: 120 * 60_000);

        foreach (var wave in spawns.GroupBy(spawn => spawn.Wave))
        {
            Assert.InRange(wave.Count(), 1, 3);
            Assert.All(wave, spawn =>
                Assert.InRange(spawn.DeathMs, wave.Key * Slimes.WaveMs + 1, (wave.Key + 1) * Slimes.WaveMs));
            Assert.Equal((wave.Key + 1) * Slimes.WaveMs, wave.Max(spawn => spawn.DeathMs));
        }
    }

    [Fact]
    public void Every_60th_slime_of_the_user_is_a_king_across_sessions()
    {
        // Começando com 50 slimes já derrotados, o 60º chega nesta sessão.
        var spawns = Slimes.Generate(seed: 99, startIndex: 50, untilMs: 200 * 60_000);

        Assert.All(spawns, spawn => Assert.Equal(spawn.Number % 60 == 0, spawn.Kind == SlimeKind.Rei));
        Assert.Equal(60, spawns.First(spawn => spawn.Kind == SlimeKind.Rei).Number);
    }

    [Fact]
    public void Kind_odds_are_close_to_60_28_12()
    {
        var spawns = Slimes.Generate(seed: 2026, startIndex: 0, untilMs: 20_000 * 60_000)
            .Where(spawn => spawn.Kind != SlimeKind.Rei)
            .ToList();

        double Share(SlimeKind kind) => spawns.Count(spawn => spawn.Kind == kind) / (double)spawns.Count;
        Assert.InRange(Share(SlimeKind.Lilas), 0.57, 0.63);
        Assert.InRange(Share(SlimeKind.Azul), 0.25, 0.31);
        Assert.InRange(Share(SlimeKind.Rosa), 0.10, 0.14);
    }

    [Fact]
    public void Average_is_about_one_slime_per_minute()
    {
        var spawns = Slimes.Generate(seed: 5, startIndex: 0, untilMs: 10_000 * 60_000);
        Assert.InRange(spawns.Count / 10_000.0, 0.95, 1.05);
    }

    [Fact]
    public void Tally_counts_only_slimes_defeated_until_the_focus_time()
    {
        var all = Slimes.Generate(seed: 11, startIndex: 0, untilMs: 25 * 60_000);
        var expected = all.Count(spawn => spawn.DeathMs <= 25 * 60_000);

        Assert.Equal(expected, Slimes.Tally(seed: 11, startIndex: 0, focusSeconds: 25 * 60).Total);
        Assert.Equal(SlimeTally.Empty, Slimes.Tally(seed: 11, startIndex: 0, focusSeconds: 0));
    }

    [Fact]
    public void Experience_values_follow_the_design()
    {
        Assert.Equal(5 + 10 + 15 + 30, new SlimeTally(1, 1, 1, 1).Experience);
        Assert.Equal(210, new SlimeTally(15, 6, 3, 1).Experience); // sessão de referência do design
    }

    [Fact]
    public void Matches_the_front_end_generator()
    {
        // Valores gerados por web/src/slimes.ts (node): se este teste quebrar, front e API divergiram.
        var random = new Slimes.Mulberry32(12345);
        Assert.Equal(0.97972826776094735, random.Next(), 15);
        Assert.Equal(0.30675226449966431, random.Next(), 15);
        Assert.Equal(0.48420542152598500, random.Next(), 15);

        Assert.Equal(new SlimeTally(15, 5, 6, 0), Slimes.Tally(seed: 1016695473, startIndex: 0, focusSeconds: 1500));
    }

    [Fact]
    public void Mulberry32_is_deterministic_and_in_range()
    {
        var a = new Slimes.Mulberry32(12345);
        var b = new Slimes.Mulberry32(12345);
        for (var i = 0; i < 1000; i++)
        {
            var value = a.Next();
            Assert.Equal(value, b.Next());
            Assert.InRange(value, 0, 0.9999999999);
        }
    }
}
