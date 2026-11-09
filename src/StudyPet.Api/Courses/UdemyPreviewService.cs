using System.Net;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace StudyPet.Api.Courses;

/// <param name="FromPage">false quando a página não pôde ser lida e o título veio só do endereço.</param>
public sealed record UdemyPreview(string Url, string Title, string? Instructor, string? Description, string Provider, bool FromPage);

/// <summary>
/// Pré-preenche o cadastro a partir de um link de curso da Udemy.
/// Não há API oficial: tenta ler o título e o instrutor da página pública e, se a Udemy
/// bloquear (ela costuma responder 403 a leituras automáticas), usa o título do próprio
/// endereço. Não tenta contornar o bloqueio. Só aceita https://www.udemy.com/course/... (evita SSRF).
/// </summary>
public sealed partial class UdemyPreviewService(HttpClient httpClient, ILogger<UdemyPreviewService> logger)
{
    public static bool TryNormalize(string? input, out Uri url)
    {
        url = null!;
        if (!Uri.TryCreate(input?.Trim(), UriKind.Absolute, out var parsed)) return false;
        if (parsed.Scheme != Uri.UriSchemeHttps) return false;
        if (parsed.Host is not ("www.udemy.com" or "udemy.com")) return false;

        var segments = parsed.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Length < 2 || segments[0] != "course" || !SlugRegex().IsMatch(segments[1])) return false;

        url = new Uri($"https://www.udemy.com/course/{segments[1]}/");
        return true;
    }

    public async Task<UdemyPreview> PreviewAsync(Uri url, CancellationToken cancellationToken) =>
        await FetchAsync(url, cancellationToken) ?? FromSlug(url);

    /// <summary>"the-complete-web-development-bootcamp" → "The Complete Web Development Bootcamp".</summary>
    public static UdemyPreview FromSlug(Uri url)
    {
        var slug = url.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries)[1];
        var words = slug.Split('-', StringSplitOptions.RemoveEmptyEntries)
            .Select(word => word.Length <= 2 && word != "ux" ? word : char.ToUpperInvariant(word[0]) + word[1..]);
        var title = string.Join(' ', words);
        return new UdemyPreview(url.ToString(), char.ToUpperInvariant(title[0]) + title[1..], null, null, "Udemy", FromPage: false);
    }

    private async Task<UdemyPreview?> FetchAsync(Uri url, CancellationToken cancellationToken)
    {
        try
        {
            using var response = await httpClient.GetAsync(url, cancellationToken);
            if (response.StatusCode != HttpStatusCode.OK)
            {
                logger.LogInformation("Udemy respondeu {Status} para {Url}", (int)response.StatusCode, url);
                return null;
            }

            var html = await response.Content.ReadAsStringAsync(cancellationToken);
            if (html.Length > 3_000_000) html = html[..3_000_000];

            var title = Meta(html, "og:title");
            var description = Meta(html, "og:description");
            var instructor = InstructorFromJsonLd(html);

            if (title is null) return null;
            title = Regex.Replace(title, @"\s*\|\s*Udemy\s*$", string.Empty);
            return new UdemyPreview(url.ToString(), title, instructor, description, "Udemy", FromPage: true);
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            logger.LogInformation(exception, "Não foi possível ler {Url}", url);
            return null;
        }
    }

    private static string? Meta(string html, string property)
    {
        var match = Regex.Match(html,
            $"<meta[^>]+property=[\"']{Regex.Escape(property)}[\"'][^>]+content=[\"']([^\"']*)[\"']",
            RegexOptions.IgnoreCase);
        return match.Success ? WebUtility.HtmlDecode(match.Groups[1].Value).Trim() : null;
    }

    private static string? InstructorFromJsonLd(string html)
    {
        foreach (Match block in JsonLdRegex().Matches(html))
        {
            try
            {
                using var document = JsonDocument.Parse(block.Groups[1].Value);
                var name = FindCreator(document.RootElement);
                if (name is not null) return name;
            }
            catch (JsonException)
            {
                // bloco inválido: tenta o próximo
            }
        }

        return null;
    }

    private static string? FindCreator(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Array:
                foreach (var item in element.EnumerateArray())
                    if (FindCreator(item) is { } found) return found;
                break;
            case JsonValueKind.Object:
                if (element.TryGetProperty("creator", out var creator))
                {
                    var first = creator.ValueKind == JsonValueKind.Array ? creator.EnumerateArray().FirstOrDefault() : creator;
                    if (first.ValueKind == JsonValueKind.Object && first.TryGetProperty("name", out var name))
                        return name.GetString();
                }
                foreach (var property in element.EnumerateObject())
                    if (FindCreator(property.Value) is { } nested) return nested;
                break;
        }

        return null;
    }

    [GeneratedRegex("^[a-z0-9-]{1,200}$")]
    private static partial Regex SlugRegex();

    [GeneratedRegex("<script[^>]+type=[\"']application/ld\\+json[\"'][^>]*>(.*?)</script>", RegexOptions.Singleline | RegexOptions.IgnoreCase)]
    private static partial Regex JsonLdRegex();
}
