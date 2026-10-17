using System.ComponentModel.DataAnnotations;

namespace ServiceTracker.Contracts.Dtos;

public class UpdateWorkDayRequest
{
    [Range(0.01, 24.0)]
    public required decimal WorkedHours { get; init; }
}
