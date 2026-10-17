namespace ServiceTracker.Contracts.Dtos;

public record RegisterResult(UserDto? User, IReadOnlyList<string> Errors)
{
    public bool Succeeded => User is not null;

    public static RegisterResult Success(UserDto user) => new(user, []);

    public static RegisterResult Failure(params string[] errors) => new(null, errors);

    public static RegisterResult Failure(IEnumerable<string> errors) => new(null, errors.ToList());
}
