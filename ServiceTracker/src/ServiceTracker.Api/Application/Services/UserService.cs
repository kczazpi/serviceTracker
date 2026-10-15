using Microsoft.AspNetCore.Identity;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Api.Core.Mapping;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Application.Services;

public class UserService(
    IJwtService jwtService,
    IUserRepository userRepository,
    UserManager<ApplicationUser> userManager,
    SignInManager<ApplicationUser> signInManager,
    ILogger<UserService> log) : IUserService
{
    public async Task<RegisterResult> RegisterAsync(UserIn newUser, CancellationToken ct)
    {
        if (await userManager.FindByEmailAsync(newUser.Email) is not null)
        {
            return RegisterResult.Failure("A user with this email already exists, please login.");
        }

        var now = DateTimeOffset.UtcNow;
        var user = new ApplicationUser
        {
            UserName = newUser.Username,
            Email = newUser.Email,
            Name = newUser.Name,
            Surname = newUser.Surname,
            IsActive = true,
            CreatedAt = now,
            UpdatedAt = now,
        };

        var created = await userManager.CreateAsync(user, newUser.Password);
        if (!created.Succeeded)
        {
            return RegisterResult.Failure(created.Errors.Select(e => e.Description));
        }

        var roleAssigned = await userManager.AddToRoleAsync(user, Roles.User);
        if (!roleAssigned.Succeeded)
        {
            log.LogError("Assigning role {Role} failed for {Email}: {Errors}",
                Roles.User, newUser.Email, string.Join("; ", roleAssigned.Errors.Select(e => e.Description)));
            await userManager.DeleteAsync(user);
            return RegisterResult.Failure("Registration failed, please try again later.");
        }

        log.LogInformation("Registered user {Email}", newUser.Email);
        return RegisterResult.Success(user.ToDto());
    }

    public async Task<string?> LoginAsync(string username, string password, CancellationToken ct)
    {
        var user = await userManager.FindByNameAsync(username);
        if (user is null || !user.IsActive) return null;

        // Counts failed attempts and enforces the lockout configured in Program.cs.
        var result = await signInManager.CheckPasswordSignInAsync(user, password, lockoutOnFailure: true);
        if (!result.Succeeded) return null;

        user.LastLoginAt = DateTimeOffset.UtcNow;
        await userManager.UpdateAsync(user);

        var roles = (await userManager.GetRolesAsync(user)).ToList();
        return jwtService.GenerateToken(user.ToDto(), roles);
    }

    public Task<UserDto?> GetByEmailAsync(string email, CancellationToken ct) =>
        userRepository.GetByEmailAsync(email, ct);

    public Task<IReadOnlyList<UserDto>> GetAllAsync(CancellationToken ct) =>
        userRepository.GetAllAsync(ct);
}
