using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.JsonWebTokens;
using ServiceTracker.Contracts;

namespace ServiceTracker.Api.Endpoints;

[ApiController]
[Route("api/auth")]
public class AuthController(IUserService userService) : ControllerBase
{
    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<ActionResult<UserDto>> Register([FromBody] UserIn request, CancellationToken ct)
    {
        var result = await userService.RegisterAsync(request, ct);
        if (!result.Succeeded) return BadRequest(new { errors = result.Errors });
        return Ok(result.User);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request, CancellationToken ct)
    {
        var token = await userService.LoginAsync(request.Username, request.Password, ct);
        if (token is null) return Unauthorized();
        return Ok(new LoginResponse(token));
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<ActionResult<UserDto>> Me(CancellationToken ct)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email);
        if (email is null) return Unauthorized();

        var user = await userService.GetByEmailAsync(email, ct);
        if (user is null) return NotFound();
        return Ok(user);
    }
}
