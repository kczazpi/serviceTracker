using ServiceTracker.Api.Application.Services;
using ServiceTracker.Api.Tests.Fakes;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Tests;

public class WorkDayServiceTests
{
    private static readonly Guid AliceId = new("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid BobId = new("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");

    private static readonly CurrentUser Alice = new(AliceId, IsAdmin: false);
    private static readonly CurrentUser Bob = new(BobId, IsAdmin: false);
    private static readonly CurrentUser Admin = new(Guid.NewGuid(), IsAdmin: true);

    private static readonly DateOnly Oct15 = new(2026, 10, 15);
    private static readonly DateOnly Oct16 = new(2026, 10, 16);
    private static readonly DateOnly Oct17 = new(2026, 10, 17);

    private static readonly CancellationToken Ct = CancellationToken.None;

    private readonly FakeWorkDayRepository _repo = new();
    private readonly WorkDayService _service;

    public WorkDayServiceTests() => _service = new WorkDayService(_repo);

    // ---- Create ----

    [Fact]
    public async Task Create_StoresTheDayForTheCaller()
    {
        var result = await _service.CreateAsync(Alice, new CreateWorkDayRequest { Date = Oct15, WorkedHours = 8.5m }, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(AliceId, result.Value!.UserId);
        Assert.Equal(Oct15, result.Value.Date);
        Assert.Equal(8.5m, result.Value.WorkedHours);
        Assert.Single(_repo.Items);
    }

    [Fact]
    public async Task Create_ReturnsConflict_WhenTheDateIsAlreadyLogged()
    {
        _repo.Seed(AliceId, Oct15, 8m);

        var result = await _service.CreateAsync(Alice, new CreateWorkDayRequest { Date = Oct15, WorkedHours = 4m }, Ct);

        Assert.Equal(ResultStatus.Conflict, result.Status);
        Assert.Null(result.Value);
        Assert.Equal(8m, Assert.Single(_repo.Items).WorkedHours);
    }

    [Fact]
    public async Task Create_AllowsTheSameDateForDifferentUsers()
    {
        _repo.Seed(BobId, Oct15);

        var result = await _service.CreateAsync(Alice, new CreateWorkDayRequest { Date = Oct15, WorkedHours = 8m }, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(2, _repo.Items.Count);
    }

    // ---- Get ----

    [Fact]
    public async Task Get_ReturnsTheDay_ForItsOwner()
    {
        var day = _repo.Seed(AliceId, Oct15);

        var result = await _service.GetAsync(Alice, day.Id, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(day.Id, result.Value!.Id);
    }

    [Fact]
    public async Task Get_ReturnsTheDay_ForAnAdmin()
    {
        var day = _repo.Seed(AliceId, Oct15);

        var result = await _service.GetAsync(Admin, day.Id, Ct);

        Assert.True(result.Succeeded);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_ForAnotherUsersDay()
    {
        var day = _repo.Seed(AliceId, Oct15);

        var result = await _service.GetAsync(Bob, day.Id, Ct);

        Assert.Equal(ResultStatus.NotFound, result.Status);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task Get_ReturnsNotFound_WhenTheDayDoesNotExist()
    {
        var result = await _service.GetAsync(Alice, Guid.NewGuid(), Ct);

        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    // ---- List ----

    [Fact]
    public async Task List_DefaultsToTheCallersOwnDays()
    {
        _repo.Seed(AliceId, Oct15);
        _repo.Seed(AliceId, Oct16);
        _repo.Seed(BobId, Oct15);

        var result = await _service.ListAsync(Alice, null, null, null, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(2, result.Value!.Count);
        Assert.All(result.Value, d => Assert.Equal(AliceId, d.UserId));
    }

    [Fact]
    public async Task List_IsAllowed_WhenTheUserIdIsTheCallersOwn()
    {
        _repo.Seed(AliceId, Oct15);

        var result = await _service.ListAsync(Alice, AliceId, null, null, Ct);

        Assert.True(result.Succeeded);
        Assert.Single(result.Value!);
    }

    [Fact]
    public async Task List_ReturnsForbidden_WhenANonAdminAsksForAnotherUser()
    {
        _repo.Seed(AliceId, Oct15);

        var result = await _service.ListAsync(Bob, AliceId, null, null, Ct);

        Assert.Equal(ResultStatus.Forbidden, result.Status);
        Assert.Null(result.Value);
    }

    [Fact]
    public async Task List_ReturnsAnotherUsersDays_ForAnAdmin()
    {
        _repo.Seed(AliceId, Oct15);
        _repo.Seed(BobId, Oct15);

        var result = await _service.ListAsync(Admin, AliceId, null, null, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(AliceId, Assert.Single(result.Value!).UserId);
    }

    [Fact]
    public async Task List_AppliesTheDateRange_Inclusively()
    {
        _repo.Seed(AliceId, Oct15);
        _repo.Seed(AliceId, Oct16);
        _repo.Seed(AliceId, Oct17);

        var onlyMiddle = await _service.ListAsync(Alice, null, Oct16, Oct16, Ct);
        var fromMiddle = await _service.ListAsync(Alice, null, Oct16, null, Ct);
        var untilFirst = await _service.ListAsync(Alice, null, null, Oct15, Ct);

        Assert.Equal(Oct16, Assert.Single(onlyMiddle.Value!).Date);
        Assert.Equal(2, fromMiddle.Value!.Count);
        Assert.Equal(Oct15, Assert.Single(untilFirst.Value!).Date);
    }

    [Fact]
    public async Task List_ReturnsAnEmptyList_WhenThereAreNoDays()
    {
        var result = await _service.ListAsync(Alice, null, null, null, Ct);

        Assert.True(result.Succeeded);
        Assert.Empty(result.Value!);
    }

    // ---- Update ----

    [Fact]
    public async Task Update_ChangesTheHours_ForTheOwner()
    {
        var day = _repo.Seed(AliceId, Oct15, 8m);

        var result = await _service.UpdateAsync(Alice, day.Id, new UpdateWorkDayRequest { WorkedHours = 6.25m }, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(6.25m, result.Value!.WorkedHours);
        Assert.Equal(6.25m, Assert.Single(_repo.Items).WorkedHours);
    }

    [Fact]
    public async Task Update_ChangesTheHours_ForAnAdmin()
    {
        var day = _repo.Seed(AliceId, Oct15, 8m);

        var result = await _service.UpdateAsync(Admin, day.Id, new UpdateWorkDayRequest { WorkedHours = 5m }, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(5m, Assert.Single(_repo.Items).WorkedHours);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_ForAnotherUser_AndLeavesTheHoursUnchanged()
    {
        var day = _repo.Seed(AliceId, Oct15, 8m);

        var result = await _service.UpdateAsync(Bob, day.Id, new UpdateWorkDayRequest { WorkedHours = 1m }, Ct);

        Assert.Equal(ResultStatus.NotFound, result.Status);
        Assert.Equal(8m, Assert.Single(_repo.Items).WorkedHours);
    }

    [Fact]
    public async Task Update_ReturnsNotFound_WhenTheDayDoesNotExist()
    {
        var result = await _service.UpdateAsync(Alice, Guid.NewGuid(), new UpdateWorkDayRequest { WorkedHours = 1m }, Ct);

        Assert.Equal(ResultStatus.NotFound, result.Status);
    }

    // ---- Delete ----

    [Fact]
    public async Task Delete_RemovesTheDayAndReturnsIt_ForTheOwner()
    {
        var day = _repo.Seed(AliceId, Oct15);

        var result = await _service.DeleteAsync(Alice, day.Id, Ct);

        Assert.True(result.Succeeded);
        Assert.Equal(day.Id, result.Value!.Id);
        Assert.Empty(_repo.Items);
    }

    [Fact]
    public async Task Delete_RemovesTheDay_ForAnAdmin()
    {
        var day = _repo.Seed(AliceId, Oct15);

        var result = await _service.DeleteAsync(Admin, day.Id, Ct);

        Assert.True(result.Succeeded);
        Assert.Empty(_repo.Items);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_ForAnotherUser_AndKeepsTheDay()
    {
        var day = _repo.Seed(AliceId, Oct15);

        var result = await _service.DeleteAsync(Bob, day.Id, Ct);

        Assert.Equal(ResultStatus.NotFound, result.Status);
        Assert.Single(_repo.Items);
    }

    [Fact]
    public async Task Delete_ReturnsNotFound_WhenTheDayDoesNotExist()
    {
        var result = await _service.DeleteAsync(Alice, Guid.NewGuid(), Ct);

        Assert.Equal(ResultStatus.NotFound, result.Status);
    }
}
