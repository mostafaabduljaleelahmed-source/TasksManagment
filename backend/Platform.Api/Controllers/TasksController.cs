using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Tasks.Dtos;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class TasksController : ControllerBase
{
    private readonly ITaskService _taskService;

    public TasksController(ITaskService taskService)
    {
        _taskService = taskService;
    }

    [HttpPost("session/{sessionId}")]
    public async Task<IActionResult> CreateTask(Guid sessionId, [FromBody] CreateProgrammingTaskDto dto, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
        {
            return Forbid("Only teachers can create tasks.");
        }

        try
        {
            var response = await _taskService.CreateTaskAsync(sessionId, dto, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("{taskId}")]
    public async Task<IActionResult> GetTask(Guid taskId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        try
        {
            var response = await _taskService.GetTaskByIdAsync(taskId, userId, role ?? "Student", cancellationToken);
            return Ok(response);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Forbid(ex.Message);
        }
    }

    [HttpDelete("{taskId}")]
    public async Task<IActionResult> DeleteTask(Guid taskId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        if (role != "Teacher")
        {
            return Forbid("Only teachers can delete tasks.");
        }

        try
        {
            await _taskService.DeleteTaskAsync(taskId, userId, cancellationToken);
            return Ok(new { message = "Task deleted successfully." });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("{taskId}/attachments")]
    public async Task<IActionResult> UploadAttachment(
        Guid taskId,
        [FromForm] IFormFile file,
        [FromServices] Platform.Infrastructure.Persistence.ApplicationDbContext dbContext,
        [FromServices] Microsoft.AspNetCore.Hosting.IWebHostEnvironment env,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
        {
            return Forbid("Only teachers can upload attachments.");
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "No file uploaded." });
        }

        // Validate File Size (max 25 MB)
        const long maxSizeBytes = 25 * 1024 * 1024;
        if (file.Length > maxSizeBytes)
        {
            return BadRequest(new { message = "File size exceeds the 25 MB limit." });
        }

        // Validate Extension
        var allowedExtensions = new[] { ".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".docx", ".doc", ".zip", ".rar", ".7z", ".pptx", ".ppt" };
        var ext = System.IO.Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!System.Linq.Enumerable.Contains(allowedExtensions, ext))
        {
            return BadRequest(new { message = $"File extension '{ext}' is not allowed. Supported formats: PDF, Images, DOCX, ZIP, PPTX." });
        }

        var task = await dbContext.ProgrammingTasks.FindAsync(new object[] { taskId }, cancellationToken);
        if (task == null)
        {
            return NotFound(new { message = "Task not found." });
        }

        var webRoot = env.WebRootPath ?? System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "wwwroot");
        var uploadsFolder = System.IO.Path.Combine(webRoot, "uploads", "attachments");
        if (!System.IO.Directory.Exists(uploadsFolder))
        {
            System.IO.Directory.CreateDirectory(uploadsFolder);
        }

        var uniqueFileName = $"{Guid.NewGuid()}_{System.IO.Path.GetFileName(file.FileName)}";
        var filePath = System.IO.Path.Combine(uploadsFolder, uniqueFileName);

        using (var stream = new System.IO.FileStream(filePath, System.IO.FileMode.Create))
        {
            await file.CopyToAsync(stream, cancellationToken);
        }

        var fileUrl = $"/uploads/attachments/{uniqueFileName}";

        var currentAttachments = string.IsNullOrWhiteSpace(task.AttachmentsJson)
            ? new System.Collections.Generic.List<TaskAttachmentDto>()
            : System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<TaskAttachmentDto>>(task.AttachmentsJson) ?? new System.Collections.Generic.List<TaskAttachmentDto>();

        var newAttachment = new TaskAttachmentDto
        {
            Id = Guid.NewGuid().ToString(),
            FileName = file.FileName,
            FileUrl = fileUrl,
            FileSize = file.Length,
            ContentType = file.ContentType,
            UploadedAt = DateTime.UtcNow
        };

        currentAttachments.Add(newAttachment);
        task.AttachmentsJson = System.Text.Json.JsonSerializer.Serialize(currentAttachments);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(currentAttachments);
    }

    [HttpDelete("{taskId}/attachments/{attachmentId}")]
    public async Task<IActionResult> DeleteAttachment(
        Guid taskId,
        string attachmentId,
        [FromServices] Platform.Infrastructure.Persistence.ApplicationDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
        {
            return Forbid("Only teachers can delete attachments.");
        }

        var task = await dbContext.ProgrammingTasks.FindAsync(new object[] { taskId }, cancellationToken);
        if (task == null)
        {
            return NotFound(new { message = "Task not found." });
        }

        var currentAttachments = string.IsNullOrWhiteSpace(task.AttachmentsJson)
            ? new System.Collections.Generic.List<TaskAttachmentDto>()
            : System.Text.Json.JsonSerializer.Deserialize<System.Collections.Generic.List<TaskAttachmentDto>>(task.AttachmentsJson) ?? new System.Collections.Generic.List<TaskAttachmentDto>();

        currentAttachments.RemoveAll(a => a.Id == attachmentId);
        task.AttachmentsJson = System.Text.Json.JsonSerializer.Serialize(currentAttachments);
        await dbContext.SaveChangesAsync(cancellationToken);

        return Ok(currentAttachments);
    }
}
