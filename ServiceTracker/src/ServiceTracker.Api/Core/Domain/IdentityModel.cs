using Microsoft.AspNetCore.Identity;

namespace ServiceTracker.Api.Core.Domain;

// UserName and Email come from IdentityUser<Guid>.
public class ApplicationUser : IdentityUser<Guid>
{
    public string Name { get; set; } = default!;
    public string Surname { get; set; } = default!;
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

    public static readonly string[] All = [User, Admin];
}
