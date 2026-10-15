namespace ServiceTracker.Contracts;

public class WorkDayDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public decimal WorkedHours { get; set; }
}
