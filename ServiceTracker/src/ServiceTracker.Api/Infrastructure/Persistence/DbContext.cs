using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using ServiceTracker.Api.Core.Domain;

using ServiceTracker.Api.Infrastructure.Persistence;

public class DbContext(DbContextOptions<WorktimeDbContext> options) : IdentityDbContext<ApplicationUser, ApplicationRole, Guid>(options)
{
    public DbSet<WorkDay> WorkDay => Set<WorkDay>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder) => optionsBuilder.UseSnakeCaseNamingConvention();
    protected override void OnModelCreating(ModelBuilder b)
    {
        base.OnModelCreating(b);
        b.Entity<WorkDay>().HasIndex(w => new { w.UserId, w.Date }).IsUnique();
    }
}

