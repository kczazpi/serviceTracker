using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Api.Core.Mapping;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Core.Repositories;

public class UserRepository(UserManager<ApplicationUser> userManager) : IUserRepository
{
    public async Task<UserDto?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var user = await userManager.FindByIdAsync(id.ToString());
        return user?.ToDto();
    }

    public async Task<UserDto?> GetByEmailAsync(string email, CancellationToken ct)
    {
        var user = await userManager.FindByEmailAsync(email);
        return user?.ToDto();
    }

    public async Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken ct)
    {
        var users = await userManager.Users
            .AsNoTracking()
            .OrderBy(u => u.UserName)
            .ToListAsync(ct);
        return users.Select(u => u.ToDto()).ToList();
    }
}
