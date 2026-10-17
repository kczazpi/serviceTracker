namespace ServiceTracker.Contracts.Dtos;

public class WorkDayDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public decimal WorkedHours { get; set; }
    public decimal OvertimeHours { get; set; }
}
