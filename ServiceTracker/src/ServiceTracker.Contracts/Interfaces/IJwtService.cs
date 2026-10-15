namespace ServiceTracker.Contracts;

public interface IJwtService
{
    string GenerateToken(UserDto user, IReadOnlyList<string> roles);
}
