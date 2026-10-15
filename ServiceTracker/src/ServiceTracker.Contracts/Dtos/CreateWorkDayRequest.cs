using System.ComponentModel.DataAnnotations;

namespace ServiceTracker.Contracts;

public class CreateWorkDayRequest
{
    public required DateOnly Date { get; init; }

    [Range(0.01, 24.0)]
    public required decimal WorkedHours { get; init; }
}
