using ServiceTracker.Contracts.Dtos;

namespace ServiceTracker.Contracts.Interfaces;

public interface IWorkDayService
{
    /// <summary>Creates a work day for the caller. Conflict if one already exists for that date.</summary>
    Task<ServiceResult<WorkDayDto>> CreateAsync(CurrentUser caller, CreateWorkDayRequest request, CancellationToken ct);

    /// <summary>Owner or admin only. Anyone else gets NotFound so ids can't be probed.</summary>
    Task<ServiceResult<WorkDayDto>> GetAsync(CurrentUser caller, Guid id, CancellationToken ct);

    /// <summary>Lists the caller's work days, or another user's when the caller is an admin (otherwise Forbidden).</summary>
    Task<ServiceResult<IReadOnlyList<WorkDayDto>>> ListAsync(
        CurrentUser caller, Guid? userId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct);

    Task<ServiceResult<WorkDayDto>> UpdateAsync(CurrentUser caller, Guid id, UpdateWorkDayRequest request, CancellationToken ct);

    Task<ServiceResult<WorkDayDto>> DeleteAsync(CurrentUser caller, Guid id, CancellationToken ct);
}
