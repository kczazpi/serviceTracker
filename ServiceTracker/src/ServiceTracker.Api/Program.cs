using WorktimeSystem.Api.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using WorktimeSystem.Api.Application.Services;
using Microsoft.IdentityModel.Tokens;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using WorktimeSystem.Api.Core.Domain;
using WorktimeSystem.Api.Core.Repositories;
using Microsoft.AspNetCore.Identity;
// using WorktimeSystem.Api.BackgroundJobs;


var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<DbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Db")));

builder.Services.AddIdentity<ApplicationUser, ApplicationRole>()
    .AddEntityFrameworkStores<DbContext>();

builder.Services.Configure<IdentityOptions>(options =>
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
});


builder.Services.AddScoped<JwtService>();
builder.Services.Configure<JwtService>(builder.Configuration.GetSection("Jwt"));

builder.Services.AddScoped<IUserRepository, UserRepository>();
builder.Services.AddScoped<IUserService, UserService>();


builder.Services.AddAuthorization();
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                System.Text.Encoding.UTF8.GetBytes(builder.Configuration["Jwt:SigningKey"]!)
            )
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
using (var scope = app.Services.CreateAsyncScope())
{
    var services = scope.ServiceProvider;
    if (app.Environment.IsDevelopment())
    {
        Console.WriteLine("Migration start");
        var tries = 0;
        while (tries < 5)
        {
            try
            {
                var context = services.GetRequiredService<WorktimeDbContext>();
                tries++;
                await context.Database.MigrateAsync();
                Console.WriteLine("All db tables created");
                break;
            }
            catch (Exception ex)
            {
                if (ex is Npgsql.PostgresException)
                {
                    Console.WriteLine("Error while creating db tables {0}", ex.Message);
                }
                else if (ex is Npgsql.NpgsqlException)
                {
                    Console.WriteLine("NpgsqlException : {0} - {1}", ex.GetType().Name, ex.Message);
                }
                else
                {
                    Console.WriteLine("Other exception : {0} - {1}", ex.GetType().Name, ex.Message);
                }
                if (tries >= 5)
                {
                    Console.WriteLine("Retry limit reached. {0}", ex.Message);
                    throw;
                }
                await Task.Delay(TimeSpan.FromMilliseconds(1000 * tries));
            }
        }
    }
    var roleManager = services.GetRequiredService<RoleManager<ApplicationRole>>();
    foreach (var role in typeof(Roles).GetFields())
    {
        try
        {
            if (!await roleManager.RoleExistsAsync(role.Name))
            {
                await roleManager.CreateAsync(new ApplicationRole { Name = (string)role.GetValue(null)! });
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine("Error while seeding identity roles {0}", ex.Message);
            throw;
        }
    }
    Console.WriteLine("All identity roles seeded");
}


app.MapControllers();
app.Run();
