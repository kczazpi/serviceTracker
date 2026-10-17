namespace ServiceTracker.Api.Core.Domain;

public class WorkDay
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public decimal WorkedHours { get; set; }
    public decimal OvertimeHours { get; set; }
}
