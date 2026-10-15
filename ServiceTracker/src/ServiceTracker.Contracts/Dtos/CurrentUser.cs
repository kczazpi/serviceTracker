namespace ServiceTracker.Contracts;

/// <summary>The authenticated caller, as extracted from the JWT.</summary>
public record CurrentUser(Guid Id, bool IsAdmin);
