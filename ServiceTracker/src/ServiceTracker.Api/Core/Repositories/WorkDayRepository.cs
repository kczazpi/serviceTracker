using Microsoft.EntityFrameworkCore;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Api.Core.Mapping;
using ServiceTracker.Api.Infrastructure.Persistence;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Core.Repositories;

public class WorkDayRepository(ServiceTrackerDbContext db) : IWorkDayRepository
{
    private IQueryable<WorkDay> Query => db.WorkDays.AsNoTracking();

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysAsync(CancellationToken ct) =>
        ToListAsync(Query, ct);

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByUserIdAsync(Guid userId, CancellationToken ct) =>
        ToListAsync(Query.Where(w => w.UserId == userId), ct);

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByDateAsync(DateOnly date, CancellationToken ct) =>
        ToListAsync(Query.Where(w => w.Date == date), ct);

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByWorkedHoursAsync(decimal hours, CancellationToken ct) =>
        ToListAsync(Query.Where(w => w.WorkedHours == hours), ct);

    public async Task<WorkDayDto?> GetWorkdayByIdAsync(Guid id, CancellationToken ct)
    {
        var workDay = await Query.FirstOrDefaultAsync(w => w.Id == id, ct);
        return workDay?.ToDto();
    }

    private static async Task<IReadOnlyList<WorkDayDto>> ToListAsync(IQueryable<WorkDay> query, CancellationToken ct)
    {
        var items = await query.OrderBy(w => w.Date).ToListAsync(ct);
        return items.Select(w => w.ToDto()).ToList();
    }
}
