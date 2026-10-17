using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ServiceTracker.Contracts.Dtos;
using ServiceTracker.Contracts.Interfaces;

namespace ServiceTracker.Api.Application.Services;

public class JwtService : IJwtService
{
    public const string RoleClaimType = "role";

    private readonly JwtOptions _opt;
    private readonly SigningCredentials _credentials;
    private readonly JsonWebTokenHandler _handler = new();

    public JwtService(IOptions<JwtOptions> options)
    {
        _opt = options.Value;
        _credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_opt.SigningKey)),
            SecurityAlgorithms.HmacSha256);
    }

    public string GenerateToken(UserDto user, IReadOnlyList<string> roles)
    {
        var now = DateTime.UtcNow;
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Name, $"{user.Name} {user.Surname}".Trim()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };
        claims.AddRange(roles.Select(role => new Claim(RoleClaimType, role)));

        var descriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(claims),
            Issuer = _opt.Issuer,
            Audience = _opt.Audience,
            NotBefore = now,
            Expires = now.AddHours(_opt.LifetimeHours),
            SigningCredentials = _credentials
        };

        return _handler.CreateToken(descriptor);
    }
}
