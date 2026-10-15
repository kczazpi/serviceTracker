using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using WorktimeSystem.Api.Core.Domain;
using WorktimeSystem.Contracts;

namespace WorktimeSystem.Api.Application.Services;

public class JwtService(IOptions<JwtOptions> options) : IJwtService
{
    private readonly JwtOptions _opt = Validate(options.Value);
    public async Task<string> GenerateToken(ApplicationUser user, IReadOnlyList<string> roles)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.SigningKey!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new List<Claim>
        {
            new (JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new (JwtRegisteredClaimNames.Name, user.Name+user.Surname),
            new (JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
            new (JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        var token = new JwtSecurityToken(
            issuer: _opt.Issuer,
            audience: _opt.Audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(_opt.LifetimeHours),
            notBefore: DateTime.UtcNow,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static JwtOptions Validate(JwtOptions options)
    {
        ArgumentNullException.ThrowIfNull(options);
        ArgumentException.ThrowIfNullOrWhiteSpace(options.SigningKey, "Siging key missing.");
        ArgumentException.ThrowIfNullOrWhiteSpace(options.Issuer, "Issuer is missing.");
        ArgumentException.ThrowIfNullOrWhiteSpace(options.Audience, "Audience is missing.");
        if (options.LifetimeHours <= 0)
        {
            throw new ArgumentException("LifetimeHours needs to be a positive value.");
        }
        if (Encoding.UTF8.GetByteCount(options.SigningKey) < 32)
        {
            throw new ArgumentOutOfRangeException("Singing key needs to be at least 256 bits long");
        }
        return options;
    }
}
