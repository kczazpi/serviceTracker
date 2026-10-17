using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Contracts.Dtos;
using ServiceTracker.Contracts.Interfaces;

namespace ServiceTracker.Api.Endpoints;

[ApiController]
[Authorize]
[Route("api/workdays")]
public class WorkDaysController(IWorkDayService workDays) : ControllerBase
{
    /// <summary>Own work days. Admins may pass userId to see someone else's. Dates are yyyy-MM-dd.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<WorkDayDto>>> List(
        [FromQuery] Guid? userId,
        [FromQuery(Name = "from")] DateOnly? fromDate,
        [FromQuery(Name = "to")] DateOnly? toDate,
        CancellationToken ct)
    {
        if (GetCaller() is not { } caller) return Unauthorized();

        if (fromDate > toDate)
        {
            ModelState.AddModelError("from", "'from' must not be later than 'to'.");
            return ValidationProblem(ModelState);
        }

        var result = await workDays.ListAsync(caller, userId, fromDate, toDate, ct);
        if (!result.Succeeded) return Error(result);
        return Ok(result.Value);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WorkDayDto>> GetById(Guid id, CancellationToken ct)
    {
        if (GetCaller() is not { } caller) return Unauthorized();

        var result = await workDays.GetAsync(caller, id, ct);
        if (!result.Succeeded) return Error(result);
        return Ok(result.Value);
    }

    [HttpPost]
    public async Task<ActionResult<WorkDayDto>> Create([FromBody] CreateWorkDayRequest request, CancellationToken ct)
    {
        if (GetCaller() is not { } caller) return Unauthorized();

        var result = await workDays.CreateAsync(caller, request, ct);
        if (!result.Succeeded) return Error(result);
        return CreatedAtAction(nameof(GetById), new { id = result.Value!.Id }, result.Value);
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WorkDayDto>> Update(Guid id, [FromBody] UpdateWorkDayRequest request, CancellationToken ct)
    {
        if (GetCaller() is not { } caller) return Unauthorized();

        var result = await workDays.UpdateAsync(caller, id, request, ct);
        if (!result.Succeeded) return Error(result);
        return Ok(result.Value);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        if (GetCaller() is not { } caller) return Unauthorized();

        var result = await workDays.DeleteAsync(caller, id, ct);
        if (!result.Succeeded) return Error(result);
        return NoContent();
    }

    private CurrentUser? GetCaller() =>
        Guid.TryParse(User.FindFirstValue(JwtRegisteredClaimNames.Sub), out var id)
            ? new CurrentUser(id, User.IsInRole(Roles.Admin))
            : null;

    private ActionResult Error<T>(ServiceResult<T> result) => result.Status switch
    {
        ResultStatus.NotFound => NotFound(),
        ResultStatus.Forbidden => Forbid(),
        ResultStatus.Conflict => Problem(
            statusCode: StatusCodes.Status409Conflict,
            title: "A work day already exists for this date."),
        _ => Problem()
    };
}
