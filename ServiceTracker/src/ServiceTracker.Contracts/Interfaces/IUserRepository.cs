using ServiceTracker.Contracts.Dtos;

namespace ServiceTracker.Contracts.Interfaces;

public interface IUserRepository
{
    Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<UserDto?> GetByEmailAsync(string email, CancellationToken ct);
    Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken ct);
}
