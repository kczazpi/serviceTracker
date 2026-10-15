using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ServiceTracker.Api.Application.Services;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Tests;

public class JwtServiceTests
{
    private static readonly UserDto Jane = new(
        new Guid("cccccccc-cccc-cccc-cccc-cccccccccccc"), "jane", "jane@example.com", "Jane", "Doe",
        IsActive: true, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, LastLoginAt: null);

    private static JwtOptions ValidOptions(string? signingKey = null, int lifetimeHours = 2) => new()
    {
        Issuer = "test-issuer",
        Audience = "test-audience",
        SigningKey = signingKey ?? new string('k', 48),
        LifetimeHours = lifetimeHours
    };

    private static string CreateToken(JwtOptions options, params string[] roles) =>
        new JwtService(Options.Create(options)).GenerateToken(Jane, roles);

    private static JsonWebToken Read(string token) => new JsonWebTokenHandler().ReadJsonWebToken(token);

    // Same rules Program.cs configures for JwtBearer.
    private static TokenValidationParameters ValidationFor(JwtOptions options) => new()
    {
        ValidIssuer = options.Issuer,
        ValidAudience = options.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.SigningKey)),
        NameClaimType = JwtRegisteredClaimNames.Name,
        RoleClaimType = JwtService.RoleClaimType
    };

    [Fact]
    public void GenerateToken_ContainsTheUsersIdentityClaims()
    {
        var jwt = Read(CreateToken(ValidOptions()));

        Assert.Equal(Jane.Id.ToString(), jwt.Subject);
        Assert.Equal("Jane Doe", jwt.GetClaim(JwtRegisteredClaimNames.Name).Value);
        Assert.Equal("jane@example.com", jwt.GetClaim(JwtRegisteredClaimNames.Email).Value);
    }

    [Fact]
    public void GenerateToken_ContainsOneRoleClaimPerRole()
    {
        var jwt = Read(CreateToken(ValidOptions(), "User", "Admin"));

        var roles = jwt.Claims.Where(c => c.Type == JwtService.RoleClaimType).Select(c => c.Value).ToList();

        Assert.Equal(2, roles.Count);
        Assert.Contains("User", roles);
        Assert.Contains("Admin", roles);
    }

    [Fact]
    public void GenerateToken_SetsIssuerAndAudience()
    {
        var jwt = Read(CreateToken(ValidOptions()));

        Assert.Equal("test-issuer", jwt.Issuer);
        Assert.Contains("test-audience", jwt.Audiences);
    }

    [Fact]
    public void GenerateToken_ExpiresAfterTheConfiguredLifetime()
    {
        var jwt = Read(CreateToken(ValidOptions(lifetimeHours: 3)));

        Assert.InRange(
            jwt.ValidTo - jwt.ValidFrom,
            TimeSpan.FromHours(3) - TimeSpan.FromSeconds(5),
            TimeSpan.FromHours(3) + TimeSpan.FromSeconds(5));
    }

    [Fact]
    public void GenerateToken_GivesEveryTokenAUniqueId()
    {
        var options = ValidOptions();

        var first = Read(CreateToken(options));
        var second = Read(CreateToken(options));

        Assert.NotEqual(first.Id, second.Id);
    }

    [Fact]
    public async Task GeneratedToken_IsAcceptedByTheAppsValidationRules_AndRoleChecksWork()
    {
        var options = ValidOptions();

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(CreateToken(options, "Admin"), ValidationFor(options));

        Assert.True(result.IsValid);
        var principal = new ClaimsPrincipal(result.ClaimsIdentity);
        Assert.True(principal.IsInRole("Admin"));
        Assert.False(principal.IsInRole("User"));
    }

    [Fact]
    public async Task GeneratedToken_IsRejected_WhenValidatedWithADifferentKey()
    {
        var token = CreateToken(ValidOptions(new string('a', 48)));
        var otherKey = ValidOptions(new string('b', 48));

        var result = await new JsonWebTokenHandler().ValidateTokenAsync(token, ValidationFor(otherKey));

        Assert.False(result.IsValid);
    }
}
