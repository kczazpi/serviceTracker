using Microsoft.AspNetCore.Identity;

namespace ServiceTracker.Api.Core.Domain;

public class ApplicationUser : IdentityUser<Guid>
{
    public string Username { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string Surname { get; set; } = default!;
    public string? Email { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
    public DateTimeOffset? LastLoginAt { get; set; }
}

public class ApplicationRole : IdentityRole<Guid> { }

public static class Roles
{
    public const string User = "User";
    public const string Admin = "Admin";
}

