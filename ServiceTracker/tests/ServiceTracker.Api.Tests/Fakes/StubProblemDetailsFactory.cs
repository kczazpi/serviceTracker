using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Infrastructure;
using Microsoft.AspNetCore.Mvc.ModelBinding;

namespace ServiceTracker.Api.Tests.Fakes;

/// <summary>
/// ControllerBase.Problem()/ValidationProblem() need a factory that normally comes from DI;
/// a controller created directly in a test has none.
/// </summary>
public class StubProblemDetailsFactory : ProblemDetailsFactory
{
    public override ProblemDetails CreateProblemDetails(
        HttpContext httpContext, int? statusCode = null, string? title = null,
        string? type = null, string? detail = null, string? instance = null) =>
        new() { Status = statusCode ?? 500, Title = title, Type = type, Detail = detail, Instance = instance };

    public override ValidationProblemDetails CreateValidationProblemDetails(
        HttpContext httpContext, ModelStateDictionary modelStateDictionary, int? statusCode = null,
        string? title = null, string? type = null, string? detail = null, string? instance = null) =>
        new(modelStateDictionary) { Status = statusCode ?? 400, Title = title, Type = type, Detail = detail, Instance = instance };
}
