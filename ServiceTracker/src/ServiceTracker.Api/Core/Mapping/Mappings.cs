using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Contracts.Dtos;

namespace ServiceTracker.Api.Core.Mapping;

public static class Mappings
{
    public static UserDto ToDto(this ApplicationUser user) => new(
        user.Id,
        user.UserName ?? string.Empty,
        user.Email ?? string.Empty,
        user.Name,
        user.Surname,
        user.IsActive,
        user.CreatedAt,
        user.UpdatedAt,
        user.LastLoginAt);

    public static WorkDayDto ToDto(this WorkDay workDay) => new()
    {
        Id = workDay.Id,
        UserId = workDay.UserId,
        Date = workDay.Date,
        OvertimeHours = workDay.OvertimeHours,
        WorkedHours = workDay.WorkedHours
    };
}
