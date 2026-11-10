namespace StudyPet.Api.Users;

public sealed record CreateUserRequest(
    string DisplayName,
    string Email,
    string Password,
    string? CharacterName);
