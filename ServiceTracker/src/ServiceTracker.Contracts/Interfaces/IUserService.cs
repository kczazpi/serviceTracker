namespace ServiceTracker.Contracts;

public interface IUserService
{
    Task<RegisterResult> RegisterAsync(UserIn newUser, CancellationToken ct);

    /// <summary>Returns a JWT on success, or null when the credentials are invalid or the user is locked out/inactive.</summary>
    Task<string?> LoginAsync(string username, string password, CancellationToken ct);

    Task<UserDto?> GetByEmailAsync(string email, CancellationToken ct);
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken ct);
}
