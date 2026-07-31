using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Auth.Dtos;

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

    [HttpPost("create-teacher")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> CreateTeacher([FromBody] CreateTeacherDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.CreateTeacherAsync(dto, cancellationToken);
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

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin([FromBody] GoogleLoginDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.GoogleLoginAsync(dto, cancellationToken);
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

    [HttpPost("verify-email")]
    public async Task<IActionResult> VerifyEmail([FromBody] VerifyEmailDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.VerifyEmailAsync(dto, cancellationToken);
            return Ok(new { success = result, message = "Email address verified successfully! You can now log in." });
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
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("resend-verification")]
    public async Task<IActionResult> ResendVerification([FromBody] ResendVerificationDto dto, CancellationToken cancellationToken)
    {
        try
        {
            await _authService.ResendVerificationEmailAsync(dto, cancellationToken);
            return Ok(new { success = true, message = "If the email is registered, a new verification link has been dispatched." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword([FromBody] ForgotPasswordDto dto, CancellationToken cancellationToken)
    {
        try
        {
            await _authService.ForgotPasswordAsync(dto, cancellationToken);
            return Ok(new { success = true, message = "If the email is registered, a password reset link has been dispatched." });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _authService.ResetPasswordAsync(dto, cancellationToken);
            return Ok(new { success = result, message = "Password reset successfully! You can now log in with your new password." });
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
            return StatusCode(500, new { message = ex.Message });
        }
    }

    [HttpPost("refresh-token")]
    public async Task<IActionResult> RefreshToken([FromBody] RefreshTokenDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var response = await _authService.RefreshTokenAsync(dto, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = ex.Message });
        }
    }
}
