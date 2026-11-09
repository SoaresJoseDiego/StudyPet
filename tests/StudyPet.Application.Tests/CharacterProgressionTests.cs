using StudyPet.Application;

namespace StudyPet.Application.Tests;

public class CharacterProgressionTests
{
    [Theory] // tabela "Exp para subir de nível" do design
    [InlineData(1, 20)]
    [InlineData(5, 175)]
    [InlineData(10, 450)]
    [InlineData(15, 775)]
    [InlineData(20, 1140)]
    [InlineData(25, 1545)]
    [InlineData(30, 1975)]
    [InlineData(40, 2910)]
    [InlineData(49, 3825)]
    public void Step_cost_matches_the_design(int level, int expected)
    {
        Assert.Equal(expected, CharacterProgression.StepCost(level));
    }

    [Theory] // coluna "Exp total" da tabela "Quanto rende e quanto custa"
    [InlineData(1, 0)]
    [InlineData(2, 20)]
    [InlineData(10, 1685)]
    [InlineData(25, 15655)]
    [InlineData(50, 81725)]
    public void Total_experience_to_reach_level_matches_the_design(int level, int expected)
    {
        Assert.Equal(expected, CharacterProgression.ExperienceToReach(level));
    }

    [Theory]
    [InlineData(0, 1)]
    [InlineData(19, 1)]
    [InlineData(20, 2)]
    [InlineData(1684, 9)]
    [InlineData(1685, 10)]
    [InlineData(81725, 50)]
    public void Level_follows_the_curve(int experience, int expectedLevel)
    {
        Assert.Equal(expectedLevel, CharacterProgression.LevelFor(experience));
    }

    [Theory]
    [InlineData(1, 1, "Semente")]
    [InlineData(9, 1, "Semente")]
    [InlineData(10, 2, "Broto")]
    [InlineData(25, 3, "Muda")]
    [InlineData(50, 4, "Florescido")]
    public void Stage_follows_level_thresholds(int level, int expectedNumber, string expectedName)
    {
        var stage = CharacterProgression.StageFor(level);
        Assert.Equal(expectedNumber, stage.Number);
        Assert.Equal(expectedName, stage.Name);
    }

    [Fact]
    public void Final_stage_has_no_next()
    {
        Assert.Null(CharacterProgression.NextStageAfter(CharacterProgression.StageFor(50)));
    }
}
