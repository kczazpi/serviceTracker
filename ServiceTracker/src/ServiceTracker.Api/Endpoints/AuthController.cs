using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WorktimeSystem.Api.Application.Services;
using WorktimeSystem.Api.Core.Domain;
using WorktimeSystem.Contracts;

namespace WorktimeSystem.Api.Endpoints;


public class AuthController(IUserService userService) : ControllerBase
{
    private readonly IUserService _userService = userService;

    [AllowAnonymous]
    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] UserIn user, CancellationToken ct)
    {
        var user = await _userService.Register(user, ct);

        if (user is null) return BadRequest();
        return Ok(user);
    }

    [AllowAnonymous]
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest login, CancellationToken ct)
    {
        var token = await _userService.Login(login.Username, login.Password, ct);
        if (token is null) return Unauthorized();
        return Ok(token);
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken ct)
    {
        var userEmail = User.FindFirst(JwtRegisteredClaimNames.Email)?.Value;
        if (userEmail is null) return Unauthorized();
        var user = await _userService.GetByEmail(userSid, ct);
        if (user is null) return NotFound();
        return Ok(user);
    }

}
