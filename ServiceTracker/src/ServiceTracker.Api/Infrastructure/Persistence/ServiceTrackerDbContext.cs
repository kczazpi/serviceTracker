using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServiceTracker.Api.Core.Domain;

namespace ServiceTracker.Api.Infrastructure.Persistence;

public class ServiceTrackerDbContext(DbContextOptions<ServiceTrackerDbContext> options)
    : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options)
{
    public DbSet<WorkDay> WorkDays => Set<WorkDay>();

    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<WorkDay>().HasIndex(w => new { w.UserId, w.Date }).IsUnique();
    }
}
