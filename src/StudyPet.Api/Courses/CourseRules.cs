using StudyPet.Domain;

namespace StudyPet.Api.Courses;

public static class CourseRules
{
    public const int MaxTitleLength = 180;
    public const int MaxLessonsPerRequest = 300;

    /// <summary>Cores dos cards de curso (iguais às do design).</summary>
    public static readonly IReadOnlySet<string> Colors = new HashSet<string> { "verde", "azul", "pessego", "lilas" };

    public static bool IsValidCategory(CourseCategory? category) => category is null || Enum.IsDefined(category.Value);

    public static bool IsValidColor(string? color) => color is null || Colors.Contains(color);

    /// <summary>Limpa uma lista de títulos de aula: remove vazios e corta no tamanho máximo.</summary>
    public static List<string> CleanTitles(IEnumerable<string>? titles) =>
        (titles ?? [])
            .Select(title => title?.Trim() ?? string.Empty)
            .Where(title => title.Length > 0)
            .Select(title => title.Length > MaxTitleLength ? title[..MaxTitleLength] : title)
            .ToList();

    public static string? Clean(string? value, int maxLength)
    {
        var trimmed = value?.Trim();
        if (string.IsNullOrEmpty(trimmed)) return null;
        return trimmed.Length > maxLength ? trimmed[..maxLength] : trimmed;
    }
}
