namespace ServiceTracker.Contracts;

public class WorkDay
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public DateOnly Date { get; set; }
    public decimal WorkedHours { get; set; }
}
