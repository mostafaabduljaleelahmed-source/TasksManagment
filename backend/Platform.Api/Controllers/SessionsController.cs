using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
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
        if (role != "Teacher")
        {
            return Forbid("Only teachers can create sessions.");
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
        if (role != "Teacher")
        {
            return Forbid("Only teachers can unlock sessions.");
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

    [HttpDelete("{sessionId}")]
    public async Task<IActionResult> DeleteSession(Guid sessionId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        if (role != "Teacher")
        {
            return Forbid("Only teachers can delete sessions.");
        }

        try
        {
            await _sessionService.DeleteSessionAsync(sessionId, userId, cancellationToken);
            return Ok(new { message = "Session deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
