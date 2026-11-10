using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using StudyPet.Domain;

namespace StudyPet.Api.Auth;

/// <summary>Emite os tokens de login. O id do usuário vai na claim "sub".</summary>
public sealed class JwtTokens(SecurityKey signingKey)
{
    public const string Issuer = "StudyPet";
    public const string Audience = "StudyPet";

    private const int MinKeyBytes = 32;
    private static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    /// <summary>Lê a chave de <c>Jwt:Key</c> (user-secrets ou variável de ambiente; nunca no repositório).</summary>
    public static SymmetricSecurityKey LoadKey(IConfiguration configuration)
    {
        var key = configuration["Jwt:Key"];
        if (key is null || Encoding.UTF8.GetByteCount(key) < MinKeyBytes)
        {
            throw new InvalidOperationException(
                $"Configure Jwt:Key com pelo menos {MinKeyBytes} bytes: " +
                "dotnet user-secrets set Jwt:Key <chave> --project src/StudyPet.Api");
        }

        return new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
    }

    public string Create(User user) => new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
    {
        Issuer = Issuer,
        Audience = Audience,
        Subject = new ClaimsIdentity([new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString())]),
        Expires = DateTime.UtcNow.Add(Lifetime),
        SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256)
    });
}
