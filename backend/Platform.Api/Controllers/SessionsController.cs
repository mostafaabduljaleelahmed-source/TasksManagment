using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Sessions.Dtos;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SessionsController : ControllerBase
{
    private readonly ISessionService _sessionService;

    public SessionsController(ISessionService sessionService)
    {
        _sessionService = sessionService;
    }

    [HttpGet("course/{courseId}")]
    public async Task<IActionResult> GetCourseSessions(Guid courseId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var sessions = await _sessionService.GetCourseSessionsAsync(courseId, userId, role ?? "Student", cancellationToken);
        return Ok(sessions);
    }

    [HttpPost("course/{courseId}")]
    public async Task<IActionResult> CreateSession(Guid courseId, [FromBody] CreateSessionDto dto, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can create sessions.");
        }

        try
        {
            var response = await _sessionService.CreateSessionAsync(courseId, dto, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{sessionId}/unlock")]
    public async Task<IActionResult> UnlockSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can unlock sessions.");
        }

        try
        {
            var response = await _sessionService.UnlockSessionAsync(sessionId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{sessionId}/lock")]
    public async Task<IActionResult> LockSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can lock sessions.");
        }

        try
        {
            var response = await _sessionService.LockSessionAsync(sessionId, cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{sessionId}")]
    public async Task<IActionResult> DeleteSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can delete sessions.");
        }

        try
        {
            await _sessionService.DeleteSessionAsync(sessionId, userId, cancellationToken);
            return Ok(new { message = "Session deleted successfully." });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(403, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(new { message = "Cannot delete session due to linked database records.", details = innerMsg });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error deleting session: {ex.Message}" });
        }
    }
}
