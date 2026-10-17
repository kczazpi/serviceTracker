using ServiceTracker.Contracts.Dtos;

namespace ServiceTracker.Contracts.Interfaces;

public interface IJwtService
{
    string GenerateToken(UserDto user, IReadOnlyList<string> roles);
}
