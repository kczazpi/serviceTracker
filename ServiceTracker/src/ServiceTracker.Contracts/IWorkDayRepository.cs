namespace ServiceTracker.Contracts;

public interface IWorkDayRepository
{
    Task<IReadonlyList<WorkDay>?> GetAllWorkdaysAsync(CancellationToken ct);
    Task<IReadonlyList<WorkDay>?> GetAllWorkdaysByUserIdAsync(Guid userId, CancellationToken ct);
    Task<IReadonlyList<WorkDay>?> GetAllWorkdaysByDateAsync(DateOnly date, CancellationToken ct);
    Task<IReadonlyList<WorkDay>?> GetAllWorkdaysByWorkedHoursAsync(decimal hours, CancellationToken ct);
    Task<WorkDay?> GetWorkdayByIdAsync(Guid id, CancellationToken ct);
}
