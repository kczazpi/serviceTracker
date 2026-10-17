using ServiceTracker.Contracts.Dtos;
using ServiceTracker.Contracts.Interfaces;

namespace ServiceTracker.Api.Application.Services;

public class WorkDayService(IWorkDayRepository repository) : IWorkDayService
{
    public async Task<ServiceResult<WorkDayDto>> CreateAsync(
        CurrentUser caller, CreateWorkDayRequest request, CancellationToken ct)
    {
        var created = await repository.AddWorkdayAsync(caller.Id, request.Date, request.WorkedHours, ct);
        return created is null
            ? ServiceResult<WorkDayDto>.Conflict()
            : ServiceResult<WorkDayDto>.Success(created);
    }

    public async Task<ServiceResult<WorkDayDto>> GetAsync(CurrentUser caller, Guid id, CancellationToken ct)
    {
        var workDay = await FindAccessibleAsync(caller, id, ct);
        return workDay is null
            ? ServiceResult<WorkDayDto>.NotFound()
            : ServiceResult<WorkDayDto>.Success(workDay);
    }

    public async Task<ServiceResult<IReadOnlyList<WorkDayDto>>> ListAsync(
        CurrentUser caller, Guid? userId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct)
    {
        var targetUserId = userId ?? caller.Id;
        if (targetUserId != caller.Id && !caller.IsAdmin)
        {
            return ServiceResult<IReadOnlyList<WorkDayDto>>.Forbidden();
        }

        var items = await repository.GetWorkdaysByUserIdAndRangeAsync(targetUserId, fromDate, toDate, ct);
        return ServiceResult<IReadOnlyList<WorkDayDto>>.Success(items);
    }

    public async Task<ServiceResult<WorkDayDto>> UpdateAsync(
        CurrentUser caller, Guid id, UpdateWorkDayRequest request, CancellationToken ct)
    {
        if (await FindAccessibleAsync(caller, id, ct) is null)
        {
            return ServiceResult<WorkDayDto>.NotFound();
        }

        var updated = await repository.UpdateWorkdayHoursAsync(id, request.WorkedHours, ct);
        return updated is null
            ? ServiceResult<WorkDayDto>.NotFound()
            : ServiceResult<WorkDayDto>.Success(updated);
    }

    public async Task<ServiceResult<WorkDayDto>> DeleteAsync(CurrentUser caller, Guid id, CancellationToken ct)
    {
        var workDay = await FindAccessibleAsync(caller, id, ct);
        if (workDay is null || !await repository.DeleteWorkdayAsync(id, ct))
        {
            return ServiceResult<WorkDayDto>.NotFound();
        }

        return ServiceResult<WorkDayDto>.Success(workDay);
    }

    // Owner or admin; null when missing or not allowed.
    private async Task<WorkDayDto?> FindAccessibleAsync(CurrentUser caller, Guid id, CancellationToken ct)
    {
        var workDay = await repository.GetWorkdayByIdAsync(id, ct);
        return workDay is not null && (workDay.UserId == caller.Id || caller.IsAdmin) ? workDay : null;
    }
}
