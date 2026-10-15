using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Tests.Fakes;

/// <summary>In-memory repository that mimics the real one, including the unique (user, date) rule.</summary>
public class FakeWorkDayRepository : IWorkDayRepository
{
    private readonly List<WorkDayDto> _items = [];

    public IReadOnlyList<WorkDayDto> Items => _items;

    public WorkDayDto Seed(Guid userId, DateOnly date, decimal workedHours = 8m)
    {
        var item = new WorkDayDto { Id = Guid.NewGuid(), UserId = userId, Date = date, WorkedHours = workedHours };
        _items.Add(item);
        return item;
    }

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysAsync(CancellationToken ct) =>
        Result(_items);

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByUserIdAsync(Guid userId, CancellationToken ct) =>
        Result(_items.Where(i => i.UserId == userId));

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByDateAsync(DateOnly date, CancellationToken ct) =>
        Result(_items.Where(i => i.Date == date));

    public Task<IReadOnlyList<WorkDayDto>> GetAllWorkdaysByWorkedHoursAsync(decimal hours, CancellationToken ct) =>
        Result(_items.Where(i => i.WorkedHours == hours));

    public Task<WorkDayDto?> GetWorkdayByIdAsync(Guid id, CancellationToken ct) =>
        Task.FromResult(_items.FirstOrDefault(i => i.Id == id));

    public Task<IReadOnlyList<WorkDayDto>> GetWorkdaysByUserIdAndRangeAsync(
        Guid userId, DateOnly? fromDate, DateOnly? toDate, CancellationToken ct) =>
        Result(_items
            .Where(i => i.UserId == userId)
            .Where(i => fromDate is null || i.Date >= fromDate)
            .Where(i => toDate is null || i.Date <= toDate));

    public Task<WorkDayDto?> AddWorkdayAsync(Guid userId, DateOnly date, decimal workedHours, CancellationToken ct)
    {
        if (_items.Any(i => i.UserId == userId && i.Date == date))
        {
            return Task.FromResult<WorkDayDto?>(null);
        }

        return Task.FromResult<WorkDayDto?>(Seed(userId, date, workedHours));
    }

    public Task<WorkDayDto?> UpdateWorkdayHoursAsync(Guid id, decimal workedHours, CancellationToken ct)
    {
        var item = _items.FirstOrDefault(i => i.Id == id);
        if (item is not null) item.WorkedHours = workedHours;
        return Task.FromResult(item);
    }

    public Task<bool> DeleteWorkdayAsync(Guid id, CancellationToken ct) =>
        Task.FromResult(_items.RemoveAll(i => i.Id == id) > 0);

    private static Task<IReadOnlyList<WorkDayDto>> Result(IEnumerable<WorkDayDto> items) =>
        Task.FromResult<IReadOnlyList<WorkDayDto>>(items.OrderBy(i => i.Date).ToList());
}
