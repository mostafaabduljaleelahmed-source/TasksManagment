using System;
using System.IO;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ProfileController : ControllerBase
{
    public class UpdateAvatarDto
    {
        public string? AvatarUrl { get; set; }
    }

    public class UpdateProfileDto
    {
        public string? Name { get; set; }
        public string? StudentId { get; set; }
        public string? AvatarUrl { get; set; }
        public bool? EmailNotificationsEnabled { get; set; }
    }

    public class ChangePasswordDto
    {
        public string OldPassword { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }

    private readonly IApplicationDbContext _context;
    private readonly IHashService _hashService;

    public ProfileController(IApplicationDbContext context, IHashService hashService)
    {
        _context = context;
        _hashService = hashService;
    }

    [HttpGet]
    public async Task<IActionResult> GetProfile(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            Role = user.Role.ToString(),
            user.StudentId,
            user.AvatarUrl,
            user.EmailNotificationsEnabled
        });
    }

    [HttpPut]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            user.Name = dto.Name.Trim();
        }

        if (user.Role == Domain.Enums.UserRole.Student && dto.StudentId != null)
        {
            user.StudentId = dto.StudentId.Trim();
        }

        if (dto.AvatarUrl != null)
        {
            user.AvatarUrl = dto.AvatarUrl;
        }

        if (dto.EmailNotificationsEnabled.HasValue)
        {
            user.EmailNotificationsEnabled = dto.EmailNotificationsEnabled.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            user.Id,
            user.Name,
            user.Email,
            Role = user.Role.ToString(),
            user.StudentId,
            user.AvatarUrl,
            user.EmailNotificationsEnabled
        });
    }

    [HttpPost("change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long." });
        }

        if (!string.IsNullOrWhiteSpace(dto.OldPassword))
        {
            var isCurrentPasswordValid = _hashService.VerifyPassword(dto.OldPassword, user.PasswordHash);
            if (!isCurrentPasswordValid && string.IsNullOrEmpty(user.GoogleId))
            {
                return BadRequest(new { message = "Incorrect current password." });
            }
        }
        else if (string.IsNullOrEmpty(user.GoogleId))
        {
            return BadRequest(new { message = "Current password is required." });
        }

        user.PasswordHash = _hashService.HashPassword(dto.NewPassword);
        user.RefreshToken = null;
        user.RefreshTokenExpires = null;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "Password updated successfully. You can now log in with either Google or your new password." });
    }

    [HttpDelete("account")]
    public async Task<IActionResult> DeleteAccount(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        if (user.Role == Domain.Enums.UserRole.Admin)
        {
            return BadRequest(new { message = "The Administrator account cannot be deleted to preserve system ownership." });
        }

        var ownsCourses = await _context.Courses.AnyAsync(c => c.TeacherId == userId, cancellationToken);
        if (ownsCourses)
        {
            return BadRequest(new { message = "Cannot delete account while owning active courses. Please transfer or delete your courses first." });
        }

        try
        {
            var enrollments = await _context.Enrollments.Where(e => e.StudentId == userId).ToListAsync(cancellationToken);
            if (enrollments.Any()) _context.Enrollments.RemoveRange(enrollments);

            var courseTeachers = await _context.CourseTeachers.Where(ct => ct.TeacherId == userId).ToListAsync(cancellationToken);
            if (courseTeachers.Any()) _context.CourseTeachers.RemoveRange(courseTeachers);

            var submissions = await _context.Submissions.Where(s => s.StudentId == userId).ToListAsync(cancellationToken);
            if (submissions.Any()) _context.Submissions.RemoveRange(submissions);

            var notifications = await _context.Notifications.Where(n => n.UserId == userId).ToListAsync(cancellationToken);
            if (notifications.Any()) _context.Notifications.RemoveRange(notifications);

            var taskViews = await _context.UserTaskViews.Where(v => v.StudentId == userId).ToListAsync(cancellationToken);
            if (taskViews.Any()) _context.UserTaskViews.RemoveRange(taskViews);

            var activityLogs = await _context.ActivityLogs.Where(a => a.UserId == userId).ToListAsync(cancellationToken);
            if (activityLogs.Any()) _context.ActivityLogs.RemoveRange(activityLogs);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new { success = true, message = "Your account has been deleted successfully." });
        }
        catch (DbUpdateException ex)
        {
            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(new { message = "Cannot delete account due to linked database records.", details = innerMsg });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to delete account: {ex.Message}" });
        }
    }

    [HttpPost("avatar")]
    public async Task<IActionResult> UpdateAvatar([FromBody] UpdateAvatarDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.AvatarUrl = dto.AvatarUrl;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, avatarUrl = user.AvatarUrl });
    }

    [HttpDelete("avatar")]
    public async Task<IActionResult> RemoveAvatar(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null)
        {
            return NotFound(new { message = "User not found." });
        }

        user.AvatarUrl = null;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, avatarUrl = (string?)null });
    }

    [HttpGet("teacher/{teacherId}")]
    public async Task<IActionResult> GetTeacherProfile(Guid teacherId, CancellationToken cancellationToken)
    {
        var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId, cancellationToken);
        if (teacher == null)
        {
            return NotFound(new { message = "Teacher not found." });
        }

        var courses = await _context.Courses
            .Where(c => c.TeacherId == teacherId)
            .ToListAsync(cancellationToken);

        var courseIds = courses.Select(c => c.Id).ToList();

        var sessions = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId))
            .ToListAsync(cancellationToken);

        var sessionIds = sessions.Select(s => s.Id).ToList();

        var tasksCount = await _context.ProgrammingTasks
            .CountAsync(t => sessionIds.Contains(t.SessionId), cancellationToken);

        var enrollments = await _context.Enrollments
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync(cancellationToken);

        var totalStudents = enrollments.Select(e => e.StudentId).Distinct().Count();

        var taskIds = await _context.ProgrammingTasks
            .Where(t => sessionIds.Contains(t.SessionId))
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => taskIds.Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        double averageStudentGrade = submissions.Any() ? Math.Round(submissions.Average(s => s.Grade), 1) : 0;

        return Ok(new
        {
            Id = teacher.Id,
            Name = teacher.Name,
            Email = teacher.Email,
            AvatarUrl = teacher.AvatarUrl,
            Role = teacher.Role.ToString(),
            JoinedAt = teacher.JoinedAt,
            CoursesCount = courses.Count(),
            SessionsCount = sessions.Count(),
            TotalStudents = totalStudents,
            TotalAssignments = tasksCount,
            AverageStudentGrade = averageStudentGrade,
            Courses = courses.Select(c => new
            {
                c.Id,
                c.Name,
                c.CourseCode,
                c.CreatedAt
            })
        });
    }
}
