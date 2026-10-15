namespace ServiceTracker.Contracts;

public record UserDto(
    Guid Id,
    string Username,
    string Email,
    string Name,
    string Surname,
    bool IsActive,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? LastLoginAt);
