using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using ServiceTracker.Api.Application.Services;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Api.Endpoints;
using ServiceTracker.Api.Tests.Fakes;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Tests;

/// <summary>
/// Calls the controller directly (no HTTP pipeline) to check how it reads the caller from the token
/// and how service results map to HTTP results. Binding and [Range] checks are covered in RequestValidationTests.
/// </summary>
public class WorkDaysControllerTests
{
    private static readonly Guid AliceId = new("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static readonly Guid BobId = new("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb");
    private static readonly DateOnly Oct15 = new(2026, 10, 15);
    private static CancellationToken Ct => TestContext.Current.CancellationToken;

    private readonly FakeWorkDayRepository _repo = new();

    // "sub" and "role" mirror the claims JwtService issues (JwtService.RoleClaimType is "role").
    private static ClaimsPrincipal Principal(Guid id, bool admin = false)
    {
        var claims = new List<Claim> { new("sub", id.ToString()) };
        if (admin) claims.Add(new Claim("role", Roles.Admin));
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test", nameType: "name", roleType: "role"));
    }

    private WorkDaysController CreateController(ClaimsPrincipal user) =>
        new(new WorkDayService(_repo))
        {
            ProblemDetailsFactory = new StubProblemDetailsFactory(),
            ControllerContext = new ControllerContext { HttpContext = new DefaultHttpContext { User = user } }
        };

    // ---- Caller extraction ----

    [Fact]
    public async Task EveryAction_ReturnsUnauthorized_WhenTheTokenHasNoSubject()
    {
        await AssertEveryActionIsUnauthorized(new ClaimsPrincipal(new ClaimsIdentity()));
    }

    [Fact]
    public async Task EveryAction_ReturnsUnauthorized_WhenTheSubjectIsNotAGuid()
    {
        var principal = new ClaimsPrincipal(new ClaimsIdentity([new Claim("sub", "not-a-guid")], "Test"));

        await AssertEveryActionIsUnauthorized(principal);
    }

    private async Task AssertEveryActionIsUnauthorized(ClaimsPrincipal user)
    {
        var controller = CreateController(user);
        var id = Guid.NewGuid();

        Assert.IsType<UnauthorizedResult>((await controller.List(null, null, null, Ct)).Result);
        Assert.IsType<UnauthorizedResult>((await controller.GetById(id, Ct)).Result);
        Assert.IsType<UnauthorizedResult>(
            (await controller.Create(new CreateWorkDayRequest { Date = Oct15, WorkedHours = 1m }, Ct)).Result);
        Assert.IsType<UnauthorizedResult>(
            (await controller.Update(id, new UpdateWorkDayRequest { WorkedHours = 1m }, Ct)).Result);
        Assert.IsType<UnauthorizedResult>(await controller.Delete(id, Ct));
    }

    // ---- Create ----

    [Fact]
    public async Task Create_Returns201WithALocationPointingAtGetById()
    {
        var controller = CreateController(Principal(AliceId));

        var result = await controller.Create(new CreateWorkDayRequest { Date = Oct15, WorkedHours = 8m }, Ct);

        var created = Assert.IsType<CreatedAtActionResult>(result.Result);
        var dto = Assert.IsType<WorkDayDto>(created.Value);
        Assert.Equal(nameof(WorkDaysController.GetById), created.ActionName);
        Assert.Equal(dto.Id, Assert.IsType<Guid>(created.RouteValues!["id"]));
        Assert.Equal(AliceId, dto.UserId);
    }

    [Fact]
    public async Task Create_Returns409_WhenTheDateIsAlreadyLogged()
    {
        _repo.Seed(AliceId, Oct15);
        var controller = CreateController(Principal(AliceId));

        var result = await controller.Create(new CreateWorkDayRequest { Date = Oct15, WorkedHours = 8m }, Ct);

        var problem = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(409, problem.StatusCode);
    }

    // ---- List ----

    [Fact]
    public async Task List_ReturnsTheCallersDays()
    {
        _repo.Seed(AliceId, Oct15);
        _repo.Seed(BobId, Oct15);
        var controller = CreateController(Principal(AliceId));

        var result = await controller.List(null, null, null, Ct);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        var days = Assert.IsAssignableFrom<IReadOnlyList<WorkDayDto>>(ok.Value);
        Assert.Equal(AliceId, Assert.Single(days).UserId);
    }

    [Fact]
    public async Task List_Returns400_WhenFromIsAfterTo()
    {
        var controller = CreateController(Principal(AliceId));

        var result = await controller.List(null, new DateOnly(2026, 10, 20), new DateOnly(2026, 10, 1), Ct);

        var response = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        var problem = Assert.IsType<ValidationProblemDetails>(response.Value);
        Assert.Equal(400, problem.Status);
        Assert.True(problem.Errors.ContainsKey("from"));
    }

    [Fact]
    public async Task List_Returns403_WhenANonAdminRequestsAnotherUsersDays()
    {
        var controller = CreateController(Principal(BobId));

        var result = await controller.List(AliceId, null, null, Ct);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Fact]
    public async Task List_ReturnsAnotherUsersDays_WhenTheTokenCarriesTheAdminRole()
    {
        _repo.Seed(AliceId, Oct15);
        var controller = CreateController(Principal(BobId, admin: true));

        var result = await controller.List(AliceId, null, null, Ct);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Single(Assert.IsAssignableFrom<IReadOnlyList<WorkDayDto>>(ok.Value));
    }

    // ---- GetById ----

    [Fact]
    public async Task GetById_ReturnsTheDay_ForItsOwner()
    {
        var day = _repo.Seed(AliceId, Oct15);
        var controller = CreateController(Principal(AliceId));

        var result = await controller.GetById(day.Id, Ct);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(day.Id, Assert.IsType<WorkDayDto>(ok.Value).Id);
    }

    [Fact]
    public async Task GetById_Returns404_ForAnotherUsersDay()
    {
        var day = _repo.Seed(AliceId, Oct15);
        var controller = CreateController(Principal(BobId));

        var result = await controller.GetById(day.Id, Ct);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    // ---- Update / Delete ----

    [Fact]
    public async Task Update_ReturnsTheUpdatedDay()
    {
        var day = _repo.Seed(AliceId, Oct15, 8m);
        var controller = CreateController(Principal(AliceId));

        var result = await controller.Update(day.Id, new UpdateWorkDayRequest { WorkedHours = 7.5m }, Ct);

        var ok = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(7.5m, Assert.IsType<WorkDayDto>(ok.Value).WorkedHours);
    }

    [Fact]
    public async Task Update_Returns404_ForAnotherUsersDay()
    {
        var day = _repo.Seed(AliceId, Oct15, 8m);
        var controller = CreateController(Principal(BobId));

        var result = await controller.Update(day.Id, new UpdateWorkDayRequest { WorkedHours = 1m }, Ct);

        Assert.IsType<NotFoundResult>(result.Result);
    }

    [Fact]
    public async Task Delete_Returns204_AndRemovesTheDay()
    {
        var day = _repo.Seed(AliceId, Oct15);
        var controller = CreateController(Principal(AliceId));

        var result = await controller.Delete(day.Id, Ct);

        Assert.IsType<NoContentResult>(result);
        Assert.Empty(_repo.Items);
    }

    [Fact]
    public async Task Delete_Returns404_ForAnotherUsersDay_AndKeepsIt()
    {
        var day = _repo.Seed(AliceId, Oct15);
        var controller = CreateController(Principal(BobId));

        var result = await controller.Delete(day.Id, Ct);

        Assert.IsType<NotFoundResult>(result);
        Assert.Single(_repo.Items);
    }
}
