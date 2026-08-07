using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Submissions.Dtos;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class SubmissionsController : ControllerBase
{
    private readonly ISubmissionService _submissionService;
    private readonly ILogger<SubmissionsController> _logger;

    public SubmissionsController(ISubmissionService submissionService, ILogger<SubmissionsController> logger)
    {
        _submissionService = submissionService;
        _logger = logger;
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
        catch (Exception ex)
        {
            _logger.LogError(ex, "RunCode failed for Task ID: {TaskId}", taskId);
            return StatusCode(500, new { message = $"Run execution error: {ex.Message}" });
        }
    }

    [HttpPost("task/{taskId}/submit")]
    public async Task<IActionResult> SubmitCode(Guid taskId, [FromBody] SubmitCodeDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "Invalid User ID." });
        }

        try
        {
            var result = await _submissionService.SubmitCodeAsync(userId, taskId, dto, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (DbUpdateException ex)
        {
            var innerMessage = ex.InnerException?.Message ?? ex.Message;
            _logger.LogError(ex, "DbUpdateException on SubmitCode for Task {TaskId}, User {UserId}: {InnerMessage}", taskId, userId, innerMessage);
            return BadRequest(new { 
                message = "Database schema mismatch or constraint failure.", 
                details = innerMessage 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error on SubmitCode for Task {TaskId}, User {UserId}: {Message}", taskId, userId, ex.Message);
            return StatusCode(500, new { message = $"Submission error: {ex.Message}" });
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
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can access all submissions.");
        }

        var result = await _submissionService.GetTaskSubmissionsAsync(taskId, cancellationToken);
        return Ok(result);
    }

    [HttpGet("{submissionId}")]
    public async Task<IActionResult> GetSubmissionById(Guid submissionId, [FromServices] IApplicationDbContext context, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can view submission details.");
        }

        var submission = await context.Submissions
            .Include(s => s.Student)
            .Include(s => s.Task)
            .ThenInclude(t => t.Session)
            .ThenInclude(sess => sess.Course)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

        if (submission == null) return NotFound(new { message = "Submission not found." });

        return Ok(new
        {
            submissionId = submission.Id,
            studentId = submission.StudentId,
            studentName = submission.Student.Name,
            studentRegisterId = submission.Student.StudentId ?? "-",
            studentAvatarUrl = submission.Student.AvatarUrl,
            taskId = submission.TaskId,
            taskTitle = submission.Task.Title,
            language = submission.Task.Language,
            description = submission.Task.Description,
            maxGrade = submission.Task.MaxGrade,
            deadline = submission.Task.Deadline,
            groupName = submission.Task.Session.Course.Name,
            submittedAt = submission.SubmittedAt,
            attemptNumber = submission.AttemptNumber,
            code = submission.Code,
            grade = submission.Grade,
            teacherFeedback = submission.TeacherFeedback,
            status = submission.Status.ToString(),
            isReviewed = submission.IsReviewed,
            publicTestCasesJson = submission.Task.PublicTestCasesJson,
            attachmentsJson = submission.Task.AttachmentsJson
        });
    }

    [HttpGet("task/{taskId}/stats")]
    public async Task<IActionResult> GetTaskStats(Guid taskId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can access task submission statistics.");
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
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can review and grade submissions.");
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

    [HttpPost("{submissionId}/edit-review")]
    public async Task<IActionResult> EditReview(Guid submissionId, [FromBody] ReviewSubmissionDto dto, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can edit submission reviews.");
        }

        try
        {
            var result = await _submissionService.EditSubmissionReviewAsync(submissionId, dto, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{submissionId}/reset-review")]
    public async Task<IActionResult> ResetReview(Guid submissionId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can reset submission reviews.");
        }

        try
        {
            var result = await _submissionService.ResetSubmissionReviewAsync(submissionId, cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("reset-all")]
    public async Task<IActionResult> ResetAllSubmissions(CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can perform bulk submission reset.");
        }

        try
        {
            var count = await _submissionService.ResetAllSubmissionsAsync(cancellationToken);
            return Ok(new { message = $"Successfully reset {count} submissions to pending state.", count });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("reset-student/{studentId}")]
    public async Task<IActionResult> ResetStudentSubmissions(Guid studentId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();
        var count = await _submissionService.ResetStudentSubmissionsAsync(studentId, cancellationToken);
        return Ok(new { message = $"Successfully reset {count} task reviews for this student.", count });
    }

    [HttpPost("reset-task/{taskId}")]
    public async Task<IActionResult> ResetTaskSubmissions(Guid taskId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();
        var count = await _submissionService.ResetTaskSubmissionsAsync(taskId, cancellationToken);
        return Ok(new { message = $"Successfully reset {count} student reviews for this task.", count });
    }

    [HttpPost("reset-course/{courseId}")]
    public async Task<IActionResult> ResetCourseSubmissions(Guid courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();
        var count = await _submissionService.ResetCourseSubmissionsAsync(courseId, cancellationToken);
        return Ok(new { message = $"Successfully reset {count} submission reviews for this course.", count });
    }

    [HttpPost("reset-platform")]
    public async Task<IActionResult> ResetPlatformSubmissions(CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin") return Forbid("Only system administrator can perform full platform reset.");
        var count = await _submissionService.ResetPlatformSubmissionsAsync(cancellationToken);
        return Ok(new { message = $"Successfully reset all {count} platform submissions to pending status.", count });
    }
}
