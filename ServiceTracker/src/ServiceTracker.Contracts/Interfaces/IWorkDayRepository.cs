namespace ServiceTracker.Contracts;

public interface IWorkDayRepository
{
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysAsync(CancellationToken ct);
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByUserIdAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByDateAsync(DateOnly date, CancellationToken ct);
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByWorkedHoursAsync(decimal hours, CancellationToken ct);
    Task<WorkDayDto?> GetWorkdayByIdAsync(Guid id, CancellationToken ct);

    /// <summary>Work days of one user, optionally limited to an inclusive date range, oldest first.</summary>
    Task<IReadOnlyList<WorkDayDto>> GetWorkdaysByUserIdAndRangeAsync(
        Guid userId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct);

    /// <summary>Returns null when the user already has a work day on that date.</summary>
    Task<WorkDayDto?> AddWorkdayAsync(Guid userId, DateOnly date, decimal workedHours, CancellationToken ct);

    /// <summary>Returns null when the work day doesn't exist.</summary>
    Task<WorkDayDto?> UpdateWorkdayHoursAsync(Guid id, decimal workedHours, CancellationToken ct);

    Task<bool> DeleteWorkdayAsync(Guid id, CancellationToken ct);
}
