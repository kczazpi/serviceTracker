using System.Security.Authentication;
using Microsoft.AspNetCore.Identity;
using WorktimeSystem.Api.Core.Domain;
using WorktimeSystem.Api.Core.Repositories;
using WorktimeSystem.Contracts;

namespace WorktimeSystem.Api.Application.Services;

public class UserService(
    IJwtService jwtService,
    UserManager<ApplicationUser> userManager,
    IUnitOfWork uow,
    ILogger<UserService> log) : IEmployeeService
{
    private readonly IJwtService _jwtService = jwtService;
    private readonly UserManager<ApplicationUser> _userManager = userManager;
    private readonly IUnitOfWork _uow = uow;
    private readonly ILogger<UserService> _log = log;

    public async Task<ApplicationUser> Register(UserIn newUser, CancellationToken ct)
    {
        try
        {
            var exists = await _userManager.FindByEmailAsync(newUser.Email, ct);
            if (exists is not null) throw new Exception("User already exists, please login");
            var newEmployee = new ApplicationUser
            {
                Name = newUser.Name,
                Surname = newUser.Surname,
                Email = newUser.Email ?? ldapUser.Email,
                IsActive = ldapUser.IsEnabled,
                CreatedAt = DateTimeOffset.UtcNow,
                UpdatedAt = DateTimeOffset.UtcNow,
            };

            var appUser = await _userRepo.GetByEmployeeId(createdEmployee.Id, ct);
            if (appUser is null)
            {
                var result = await _userManager.CreateAsync(
                        new ApplicationUser
                        {
                            Name = newUser.Name,
                            Surname = newUser.Surname,
                            LastLoginAt = newEmployee.UpdatedAt
                        }, newUser.password
                    );
                if (!result.Succeeded) throw new Exception("Identity user creaton failed");
            }
            else
            {
                appUser.LastLoginAt = DateTimeOffset.UtcNow;
                _ = await _userManager.UpdateAsync(appUser) ?? throw new Exception("Identity user update failed");
            }
            return createdEmployee;
        }
        catch (Exception ex)
        {
            _log.LogError(ex, $"Registration failed for Email: {ldapUser.Email}");
            throw;
        }
    }

    public async Task<string> Login(string username, string password, CancellationToken ct)
    {
        //TODO:Validate login 
        return await _jwtService.GenerateToken(user, roles);
    }

    public async Task<bool> Update(ApplicationUser user, CancellationToken ct)
    {
        return await _userManager.UpdateAsync(user, ct);
    }

    public async Task<List<ApplicationUser>?> GetAll(CancellationToken ct)
    {
        return await _userManager.GetAll(ct);
    }
}
