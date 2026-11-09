using StudyPet.Application;
using StudyPet.Domain;

namespace StudyPet.Api.Users;

public sealed record CharacterResponse(
    int Id,
    string Name,
    int Level,
    int Experience,
    int Coins,
    int ExperienceForCurrentLevel,
    int ExperienceForNextLevel,
    int Stage,
    string StageName,
    string? NextStageName,
    int? NextStageLevel)
{
    public static CharacterResponse From(StudyCharacter character)
    {
        var stage = CharacterProgression.StageFor(character.Level);
        var next = CharacterProgression.NextStageAfter(stage);

        return new(
            character.Id,
            character.Name,
            character.Level,
            character.Experience,
            character.Coins,
            CharacterProgression.ExperienceToReach(character.Level),
            CharacterProgression.ExperienceToReach(character.Level + 1),
            stage.Number,
            stage.Name,
            next?.Name,
            next?.MinLevel);
    }
}
