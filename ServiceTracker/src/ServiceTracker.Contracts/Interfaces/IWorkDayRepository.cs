namespace ServiceTracker.Contracts;

public interface IWorkDayRepository
{
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysAsync(CancellationToken ct);
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByUserIdAsync(Guid userId, CancellationToken ct);
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByDateAsync(DateOnly date, CancellationToken ct);
    Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByWorkedHoursAsync(decimal hours, CancellationToken ct);
    Task<WorkDayDto?> GetWorkdayByIdAsync(Guid id, CancellationToken ct);
}
