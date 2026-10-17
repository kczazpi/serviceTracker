using Microsoft.EntityFrameworkCore;
using Npgsql;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Api.Core.Mapping;
using ServiceTracker.Api.Infrastructure.Persistence;
using ServiceTracker.Contracts.Dtos;
using ServiceTracker.Contracts.Interfaces;

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

    public Task<IReadOnlyList<WorkDayDto>> GetWorkdaysByUserIdAndRangeAsync(
        Guid userId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct)
    {
        var query = Query.Where(w => w.UserId == userId);
        if (fromDate is { } start) query = query.Where(w => w.Date >= start);
        if (toDate is { } end) query = query.Where(w => w.Date <= end);
        return ToListAsync(query, ct);
    }

    public async Task<WorkDayDto?> AddWorkdayAsync(Guid userId, DateOnly date, decimal workedHours, CancellationToken ct)
    {
        var workDay = new WorkDay { UserId = userId, Date = date, WorkedHours = workedHours };
        db.WorkDays.Add(workDay);

        try
        {
            await db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException { SqlState: PostgresErrorCodes.UniqueViolation })
        {
            // Unique index on (user_id, date): the user already logged this day.
            return null;
        }

        return workDay.ToDto();
    }

    public async Task<WorkDayDto?> UpdateWorkdayHoursAsync(Guid id, decimal workedHours, CancellationToken ct)
    {
        var workDay = await db.WorkDays.FirstOrDefaultAsync(w => w.Id == id, ct);
        if (workDay is null) return null;

        workDay.WorkedHours = workedHours;
        await db.SaveChangesAsync(ct);
        return workDay.ToDto();
    }

    public async Task<bool> DeleteWorkdayAsync(Guid id, CancellationToken ct) =>
        await db.WorkDays.Where(w => w.Id == id).ExecuteDeleteAsync(ct) > 0;

    private static async Task<IReadOnlyList<WorkDayDto>> ToListAsync(IQueryable<WorkDay> query, CancellationToken ct)
    {
        var items = await query.OrderBy(w => w.Date).ToListAsync(ct);
        return items.Select(w => w.ToDto()).ToList();
    }
}
