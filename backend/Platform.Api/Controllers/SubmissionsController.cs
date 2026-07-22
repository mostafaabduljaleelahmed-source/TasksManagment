using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Submissions.Dtos;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;

    public SubmissionsController(ISubmissionService submissionService)
    {
        _submissionService = submissionService;
    }

    [HttpPost("task/{taskId}/run")]
    public async Task<IActionResult> RunCode(Guid taskId, [FromBody] RunCodeDto dto, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _submissionService.RunCodeAsync(taskId, dto, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("task/{taskId}/submit")]
    public async Task<IActionResult> SubmitCode(Guid taskId, [FromBody] SubmitCodeDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        try
        {
            var result = await _submissionService.SubmitCodeAsync(userId, taskId, dto, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex) when (ex is InvalidOperationException || ex is ArgumentException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("task/{taskId}/history")]
    public async Task<IActionResult> GetStudentHistory(Guid taskId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var result = await _submissionService.GetStudentTaskSubmissionsAsync(userId, taskId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("task/{taskId}/teacher")]
    public async Task<IActionResult> GetTeacherSubmissions(Guid taskId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
        {
            return Forbid("Only teachers can access all submissions.");
        }

        var result = await _submissionService.GetTaskSubmissionsAsync(taskId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("task/{taskId}/stats")]
    public async Task<IActionResult> GetTaskStats(Guid taskId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
        {
            return Forbid("Only teachers can access task submission statistics.");
        }

        try
        {
            var result = await _submissionService.GetTaskSubmissionsStatsAsync(taskId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("task/{taskId}/student-stats")]
    public async Task<IActionResult> GetStudentTaskStats(Guid taskId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        try
        {
            var result = await _submissionService.GetStudentTaskStatsAsync(userId, taskId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{submissionId}/review")]
    public async Task<IActionResult> ReviewSubmission(Guid submissionId, [FromBody] ReviewSubmissionDto dto, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
        {
            return Forbid("Only teachers can review and grade submissions.");
        }

        try
        {
            var result = await _submissionService.ReviewSubmissionAsync(submissionId, dto, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }
}
