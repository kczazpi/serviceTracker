using System.ComponentModel.DataAnnotations;

namespace ServiceTracker.Api.Application.Services;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; set; } = default!;

    [Required]
    public string Audience { get; set; } = default!;

    /// <summary>HMAC-SHA256 key, at least 32 characters (256 bits). Keep it out of source control.</summary>
    [Required, MinLength(32)]
    public string SigningKey { get; set; } = default!;

    [Range(1, 24 * 30)]
    public int LifetimeHours { get; set; } = 2;
}
