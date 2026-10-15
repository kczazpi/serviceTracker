using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ServiceTracker.Api.Application.Services;
using ServiceTracker.Api.Core.Domain;
using ServiceTracker.Api.Core.Repositories;
using ServiceTracker.Api.Infrastructure.Persistence;
using ServiceTracker.Contracts;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<ServiceTrackerDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Db"))
        .UseSnakeCaseNamingConvention());

// AddIdentityCore (not AddIdentity) so no cookie auth is registered; this API only uses JWT bearer tokens.
builder.Services.AddIdentityCore<ApplicationUser>(options =>
    {
        // Password settings.
        options.Password.RequireDigit = true;
        options.Password.RequireLowercase = true;
        options.Password.RequireNonAlphanumeric = true;
        options.Password.RequireUppercase = true;
        options.Password.RequiredLength = 6;
        options.Password.RequiredUniqueChars = 1;

        // Lockout settings.
        options.Lockout.DefaultLockoutTimeSpan = TimeSpan.FromMinutes(5);
        options.Lockout.MaxFailedAccessAttempts = 5;
        options.Lockout.AllowedForNewUsers = true;

        // User settings.
        options.User.AllowedUserNameCharacters =
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._@+";
        options.User.RequireUniqueEmail = true;
    })
    .AddRoles<ApplicationRole>()
    .AddEntityFrameworkStores<ServiceTrackerDbContext>()
    .AddSignInManager();

// Fails at startup with a clear message if the Jwt section is missing or invalid.
builder.Services.AddOptions<JwtOptions>()
    .Bind(builder.Configuration.GetSection(JwtOptions.SectionName))
    .ValidateDataAnnotations()
    .ValidateOnStart();

builder.Services.AddSingleton<IJwtService, JwtService>();
builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IWorkDayRepository, WorkDayRepository>();
builder.Services.AddScoped<IUserService, UserService>();

builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme).AddJwtBearer();
builder.Services.AddOptions<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme)
    .Configure<IOptions<JwtOptions>>((bearer, jwtOptions) =>
    {
        var jwt = jwtOptions.Value;
        bearer.MapInboundClaims = false; // keep claim names as issued ("sub", "email", "role", ...)
        bearer.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt.Issuer,
            ValidAudience = jwt.Audience,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.SigningKey)),
            NameClaimType = JwtRegisteredClaimNames.Name,
            RoleClaimType = JwtService.RoleClaimType
        };
    });

builder.Services.AddControllers();

// Test health check endpoint
builder.Services.AddHealthChecks()
    .AddCheck("Test", () => HealthCheckResult.Healthy("OK"));

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthChecks("/health");
app.MapControllers();

await using (var scope = app.Services.CreateAsyncScope())
{
    var services = scope.ServiceProvider;

    if (app.Environment.IsDevelopment())
    {
        await MigrateWithRetryAsync(services.GetRequiredService<ServiceTrackerDbContext>(), app.Logger);
    }

    var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();
    foreach (var roleName in Roles.All)
    {
        if (await roleManager.RoleExistsAsync(roleName)) continue;

        var created = await roleManager.CreateAsync(new ApplicationRole { Name = roleName });
        if (!created.Succeeded)
        {
            throw new InvalidOperationException(
                $"Seeding role '{roleName}' failed: {string.Join("; ", created.Errors.Select(e => e.Description))}");
        }
    }
    app.Logger.LogInformation("All identity roles seeded");
}

app.Run();

// The database container may still be starting up, so retry a few times before giving up.
static async Task MigrateWithRetryAsync(ServiceTrackerDbContext context, ILogger logger)
{
    const int maxTries = 5;
    for (var tries = 1; ; tries++)
    {
        try
        {
            await context.Database.MigrateAsync();
            logger.LogInformation("Database migrated");
            return;
        }
        catch (Exception ex) when (tries < maxTries)
        {
            logger.LogWarning(ex, "Migration attempt {Try}/{Max} failed, retrying", tries, maxTries);
            await Task.Delay(TimeSpan.FromSeconds(tries));
        }
    }
}
