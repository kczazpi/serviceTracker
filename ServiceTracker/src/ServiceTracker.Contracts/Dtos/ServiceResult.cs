namespace ServiceTracker.Contracts;

public enum ResultStatus
{
    Success,
    NotFound,
    Forbidden,
    Conflict
}

public record ServiceResult<T>(ResultStatus Status, T? Value = default)
{
    public bool Succeeded => Status == ResultStatus.Success;

    public static ServiceResult<T> Success(T value) => new(ResultStatus.Success, value);
    public static ServiceResult<T> NotFound() => new(ResultStatus.NotFound);
    public static ServiceResult<T> Forbidden() => new(ResultStatus.Forbidden);
    public static ServiceResult<T> Conflict() => new(ResultStatus.Conflict);
}
