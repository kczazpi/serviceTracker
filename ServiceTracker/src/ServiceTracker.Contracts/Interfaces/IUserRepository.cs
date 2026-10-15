namespace ServiceTracker.Contracts;

public interface IUserRepository
{
    Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<UserDto?> GetByEmailAsync(string email, CancellationToken ct);
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken ct);
}
