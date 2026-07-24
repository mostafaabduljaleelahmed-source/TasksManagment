using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Auth.Dtos;
using Platform.Infrastructure.Persistence;

namespace Platform.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.RegisterAsync(dto, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message}: {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, new { message = msg });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.LoginAsync(dto, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            var msg = ex.InnerException != null ? $"{ex.Message}: {ex.InnerException.Message}" : ex.Message;
            return StatusCode(500, new { message = msg });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordDto dto,
        [FromServices] ApplicationDbContext context,
        [FromServices] IEmailService emailService,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            return BadRequest(new { message = "Email address is required." });
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await Microsoft.EntityFrameworkCore.EntityFrameworkQueryableExtensions.FirstOrDefaultAsync(
            context.Users, u => u.Email == normalizedEmail, cancellationToken);

        if (user != null)
        {
            var resetToken = $"RST-{Guid.NewGuid().ToString("N")[..6].ToUpper()}";
            await emailService.SendPasswordResetNotificationAsync(user, resetToken, cancellationToken);
        }

        return Ok(new { success = true, message = "If the email is registered, a password reset email has been dispatched." });
    }
}

public class ForgotPasswordDto
{
    public string Email { get; set; } = string.Empty;
}
