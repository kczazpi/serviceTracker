namespace ServiceTracker.Api.Core.Domain;

public class UserIn
{
    public string Username { get; set; } = default!;
    public string? Name { get; set; }
    public string? Surname { get; set; }
    public string Password { get; set; } = default!;
    public string? Email { get; set; }
}
