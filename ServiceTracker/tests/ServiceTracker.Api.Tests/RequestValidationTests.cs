using System.ComponentModel.DataAnnotations;
using ServiceTracker.Api.Application.Services;
using ServiceTracker.Contracts.Dtos;

namespace ServiceTracker.Api.Tests;

/// <summary>The DataAnnotations rules on request DTOs and options; ASP.NET Core applies the same rules to incoming requests.</summary>
public class RequestValidationTests
{
    private static bool IsValid(object instance) =>
        Validator.TryValidateObject(instance, new ValidationContext(instance), [], validateAllProperties: true);

    [Theory]
    [InlineData(0.01, true)]
    [InlineData(8.0, true)]
    [InlineData(24.0, true)]
    [InlineData(0.0, false)]
    [InlineData(-1.0, false)]
    [InlineData(24.01, false)]
    public void CreateWorkDayRequest_AcceptsOnlyHoursBetweenZeroAndTwentyFour(double hours, bool expected)
    {
        var request = new CreateWorkDayRequest { Date = new DateOnly(2026, 10, 15), WorkedHours = (decimal)hours };

        Assert.Equal(expected, IsValid(request));
    }

    [Theory]
    [InlineData(0.01, true)]
    [InlineData(24.0, true)]
    [InlineData(0.0, false)]
    [InlineData(24.01, false)]
    public void UpdateWorkDayRequest_AcceptsOnlyHoursBetweenZeroAndTwentyFour(double hours, bool expected)
    {
        var request = new UpdateWorkDayRequest { WorkedHours = (decimal)hours };

        Assert.Equal(expected, IsValid(request));
    }

    private static UserIn ValidUser() => new()
    {
        Username = "jane",
        Name = "Jane",
        Surname = "Doe",
        Password = "Passw0rd!",
        Email = "jane@example.com"
    };

    [Fact]
    public void UserIn_IsValid_WhenEveryFieldIsFilledIn() => Assert.True(IsValid(ValidUser()));

    [Fact]
    public void UserIn_RequiresAValidEmailAddress()
    {
        var user = ValidUser();
        user.Email = "not-an-email";

        Assert.False(IsValid(user));
    }

    [Theory]
    [InlineData(nameof(UserIn.Username))]
    [InlineData(nameof(UserIn.Name))]
    [InlineData(nameof(UserIn.Surname))]
    [InlineData(nameof(UserIn.Password))]
    [InlineData(nameof(UserIn.Email))]
    public void UserIn_RequiresEveryField(string property)
    {
        var user = ValidUser();
        typeof(UserIn).GetProperty(property)!.SetValue(user, null);

        Assert.False(IsValid(user));
    }

    private static JwtOptions ValidJwtOptions() => new()
    {
        Issuer = "issuer",
        Audience = "audience",
        SigningKey = new string('k', 32),
        LifetimeHours = 2
    };

    [Fact]
    public void JwtOptions_AreValid_WhenFilledInProperly() => Assert.True(IsValid(ValidJwtOptions()));

    [Theory]
    [InlineData(31, false)]
    [InlineData(32, true)]
    public void JwtOptions_RequireASigningKeyOfAtLeast32Characters(int length, bool expected)
    {
        var options = ValidJwtOptions();
        options.SigningKey = new string('k', length);

        Assert.Equal(expected, IsValid(options));
    }

    [Theory]
    [InlineData(0, false)]
    [InlineData(1, true)]
    [InlineData(720, true)]
    [InlineData(721, false)]
    public void JwtOptions_LifetimeMustBeBetweenOneHourAndThirtyDays(int hours, bool expected)
    {
        var options = ValidJwtOptions();
        options.LifetimeHours = hours;

        Assert.Equal(expected, IsValid(options));
    }

    [Fact]
    public void JwtOptions_RequireAnIssuerAndAnAudience()
    {
        var noIssuer = ValidJwtOptions();
        noIssuer.Issuer = "";
        var noAudience = ValidJwtOptions();
        noAudience.Audience = "";

        Assert.False(IsValid(noIssuer));
        Assert.False(IsValid(noAudience));
    }
}
