using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Platform.Api.Middleware;

public class GlobalExceptionMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionMiddleware> _logger;
    private readonly IHostEnvironment _env;

    public GlobalExceptionMiddleware(RequestDelegate next, ILogger<GlobalExceptionMiddleware> logger, IHostEnvironment env)
    {
        _next = next;
        _logger = logger;
        _env = env;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);

            // Intercept non-success status codes (401, 403, 404, 500) if response body hasn't started
            var contentType = context.Response.ContentType;
            if (!context.Response.HasStarted && context.Response.StatusCode >= 400 && (string.IsNullOrEmpty(contentType) || !contentType.Contains("application/json", StringComparison.OrdinalIgnoreCase)))
            {
                context.Response.ContentType = "application/json; charset=utf-8";
                var errorResponse = new
                {
                    statusCode = context.Response.StatusCode,
                    message = GetStatusMessage(context.Response.StatusCode),
                    error = Enum.GetName(typeof(HttpStatusCode), context.Response.StatusCode) ?? "Error"
                };
                await context.Response.WriteAsync(JsonSerializer.Serialize(errorResponse));
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled API Exception intercepted by GlobalExceptionMiddleware: {Message}", ex.Message);
            await HandleExceptionAsync(context, ex, _env);
        }
    }

    private static Task HandleExceptionAsync(HttpContext context, Exception exception, IHostEnvironment env)
    {
        if (context.Response.HasStarted)
        {
            return Task.CompletedTask;
        }

        context.Response.ContentType = "application/json; charset=utf-8";

        var statusCode = exception switch
        {
            ArgumentException => HttpStatusCode.BadRequest,
            InvalidOperationException => HttpStatusCode.BadRequest,
            UnauthorizedAccessException => HttpStatusCode.Unauthorized,
            KeyNotFoundException => HttpStatusCode.NotFound,
            _ => HttpStatusCode.InternalServerError
        };

        context.Response.StatusCode = (int)statusCode;

        var response = new
        {
            statusCode = (int)statusCode,
            message = exception.Message,
            error = exception.GetType().Name,
            detail = env.IsDevelopment() ? exception.StackTrace : null
        };

        var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
        return context.Response.WriteAsync(JsonSerializer.Serialize(response, options));
    }

    private static string GetStatusMessage(int statusCode)
    {
        return statusCode switch
        {
            400 => "Bad Request",
            401 => "Unauthorized access. Please login to continue.",
            403 => "Forbidden. You do not have permission to access this resource.",
            404 => "Requested resource not found.",
            500 => "An internal server error occurred.",
            _ => "An error occurred processing your request."
        };
    }
}
