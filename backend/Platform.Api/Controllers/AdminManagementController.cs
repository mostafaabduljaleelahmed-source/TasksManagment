using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminManagementController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IHashService _hashService;

    public AdminManagementController(IApplicationDbContext context, IHashService hashService)
    {
        _context = context;
        _hashService = hashService;
    }

    // ==========================================
    // 1. ADMIN DASHBOARD STATS
    // ==========================================
    [HttpGet("dashboard-stats")]
    public async Task<IActionResult> GetDashboardStats(CancellationToken cancellationToken)
    {
        var totalStudents = await _context.Users.CountAsync(u => u.Role == UserRole.Student, cancellationToken);
        var totalTeachers = await _context.Users.CountAsync(u => u.Role == UserRole.Teacher, cancellationToken);
        var totalCourses = await _context.Courses.CountAsync(cancellationToken);
        var totalSessions = await _context.Sessions.CountAsync(cancellationToken);
        var totalTasks = await _context.ProgrammingTasks.CountAsync(cancellationToken);
        var totalSubmissions = await _context.Submissions.CountAsync(cancellationToken);
        var pendingReviews = await _context.Submissions.CountAsync(s => s.ExecutionStatus == "PendingEvaluation" || string.IsNullOrEmpty(s.TeacherFeedback), cancellationToken);

        var recentActivity = await _context.ActivityLogs
            .Include(a => a.User)
            .OrderByDescending(a => a.Timestamp)
            .Take(10)
            .Select(a => new
            {
                a.Id,
                a.Action,
                a.Details,
                UserName = a.User.Name,
                UserRole = a.User.Role.ToString(),
                a.Timestamp
            })
            .ToListAsync(cancellationToken);

        var newestStudents = await _context.Users
            .Where(u => u.Role == UserRole.Student)
            .OrderByDescending(u => u.JoinedAt)
            .Take(5)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                u.StudentId,
                u.JoinedAt,
                u.IsDisabled
            })
            .ToListAsync(cancellationToken);

        var newestCourses = await _context.Courses
            .Include(c => c.Teacher)
            .OrderByDescending(c => c.CreatedAt)
            .Take(5)
            .Select(c => new
            {
                c.Id,
                c.Name,
                c.CourseCode,
                TeacherName = c.Teacher != null ? c.Teacher.Name : "Unassigned",
                c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            totalStudents,
            totalTeachers,
            totalCourses,
            totalSessions,
            totalTasks,
            totalSubmissions,
            pendingReviews,
            recentActivity,
            newestStudents,
            newestCourses
        });
    }

    // ==========================================
    // 2. USER MANAGEMENT
    // ==========================================
    [HttpGet("users")]
    public async Task<IActionResult> GetUsers([FromQuery] string? role, CancellationToken cancellationToken)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(role) && Enum.TryParse<UserRole>(role, true, out var parsedRole))
        {
            query = query.Where(u => u.Role == parsedRole);
        }

        var users = await query
            .OrderByDescending(u => u.JoinedAt)
            .Select(u => new
            {
                u.Id,
                u.Name,
                u.Email,
                Role = u.Role.ToString(),
                u.StudentId,
                u.AvatarUrl,
                u.IsDisabled,
                u.IsEmailVerified,
                u.JoinedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(users);
    }

    [HttpGet("users/{userId}")]
    public async Task<IActionResult> GetUserProfile(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Role == UserRole.Teacher)
        {
            var courses = await _context.Courses.Where(c => c.TeacherId == userId).ToListAsync(cancellationToken);
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                Role = user.Role.ToString(),
                user.AvatarUrl,
                user.IsDisabled,
                user.JoinedAt,
                CoursesCount = courses.Count,
                Courses = courses.Select(c => new { c.Id, c.Name, c.CourseCode })
            });
        }
        else
        {
            var enrollments = await _context.Enrollments.Include(e => e.Course).Where(e => e.StudentId == userId).ToListAsync(cancellationToken);
            var submissionsCount = await _context.Submissions.CountAsync(s => s.StudentId == userId, cancellationToken);
            return Ok(new
            {
                user.Id,
                user.Name,
                user.Email,
                Role = user.Role.ToString(),
                user.StudentId,
                user.AvatarUrl,
                user.IsDisabled,
                user.JoinedAt,
                SubmissionsCount = submissionsCount,
                EnrolledCourses = enrollments.Select(e => new { e.Course.Id, e.Course.Name, e.Course.CourseCode })
            });
        }
    }

    [HttpPost("users/{userId}/toggle-status")]
    public async Task<IActionResult> ToggleUserStatus(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Role == UserRole.Admin)
        {
            return BadRequest(new { message = "The System Administrator account cannot be disabled." });
        }

        user.IsDisabled = !user.IsDisabled;
        if (user.IsDisabled)
        {
            user.RefreshToken = null;
            user.RefreshTokenExpires = null;
        }

        await _context.SaveChangesAsync(cancellationToken);

        var statusMessage = user.IsDisabled ? "disabled" : "enabled";
        return Ok(new { success = true, isDisabled = user.IsDisabled, message = $"Account for '{user.Name}' has been {statusMessage}." });
    }

    [HttpDelete("users/{userId}")]
    public async Task<IActionResult> DeleteUser(Guid userId, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound(new { message = "User not found." });

        if (user.Role == UserRole.Admin)
        {
            return BadRequest(new { message = "The System Administrator account cannot be deleted." });
        }

        // Check if user is primary teacher of any course
        var ownsCourses = await _context.Courses.AnyAsync(c => c.TeacherId == userId, cancellationToken);
        if (ownsCourses)
        {
            return BadRequest(new { message = $"Cannot delete user '{user.Name}' because they are the primary teacher of one or more courses. Please reassign or delete their courses first." });
        }

        try
        {
            // 1. Purge Enrollments
            var enrollments = await _context.Enrollments.Where(e => e.StudentId == userId).ToListAsync(cancellationToken);
            if (enrollments.Any()) _context.Enrollments.RemoveRange(enrollments);

            // 2. Purge CourseTeacher collaborations
            var courseTeachers = await _context.CourseTeachers.Where(ct => ct.TeacherId == userId).ToListAsync(cancellationToken);
            if (courseTeachers.Any()) _context.CourseTeachers.RemoveRange(courseTeachers);

            // 3. Purge Submissions
            var submissions = await _context.Submissions.Where(s => s.StudentId == userId).ToListAsync(cancellationToken);
            if (submissions.Any()) _context.Submissions.RemoveRange(submissions);

            // 4. Purge Notifications
            var notifications = await _context.Notifications.Where(n => n.UserId == userId).ToListAsync(cancellationToken);
            if (notifications.Any()) _context.Notifications.RemoveRange(notifications);

            // 5. Purge UserTaskViews
            var taskViews = await _context.UserTaskViews.Where(v => v.StudentId == userId).ToListAsync(cancellationToken);
            if (taskViews.Any()) _context.UserTaskViews.RemoveRange(taskViews);

            // 6. Purge ActivityLogs
            var activityLogs = await _context.ActivityLogs.Where(a => a.UserId == userId).ToListAsync(cancellationToken);
            if (activityLogs.Any()) _context.ActivityLogs.RemoveRange(activityLogs);

            _context.Users.Remove(user);
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new { success = true, message = $"User '{user.Name}' deleted successfully." });
        }
        catch (DbUpdateException ex)
        {
            var innerMsg = ex.InnerException?.Message ?? ex.Message;
            return BadRequest(new { message = "Cannot delete user due to linked database records.", details = innerMsg });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Failed to delete user: {ex.Message}" });
        }
    }

    public class AdminResetUserPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    [HttpPost("users/{userId}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(Guid userId, [FromBody] AdminResetUserPasswordDto dto, CancellationToken cancellationToken)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (user == null) return NotFound(new { message = "User not found." });

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long." });
        }

        user.PasswordHash = _hashService.HashPassword(dto.NewPassword);
        user.RefreshToken = null;
        user.RefreshTokenExpires = null;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = $"Password for '{user.Name}' reset successfully." });
    }

    // ==========================================
    // 3. SYSTEM SETTINGS
    // ==========================================
    [AllowAnonymous]
    [HttpGet("settings")]
    public async Task<IActionResult> GetSystemSettings(CancellationToken cancellationToken)
    {
        var settings = await _context.SystemSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings == null)
        {
            settings = new SystemSetting();
            _context.SystemSettings.Add(settings);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(settings);
    }

    public class UpdateSystemSettingsDto
    {
        public string? AcademyName { get; set; }
        public string? AcademyLogo { get; set; }
        public string? PrimaryColor { get; set; }
        public string? SecondaryColor { get; set; }
        public string? ContactEmail { get; set; }
        public string? SupportEmail { get; set; }
        public string? FooterText { get; set; }
    }

    [HttpPut("settings")]
    public async Task<IActionResult> UpdateSystemSettings([FromBody] UpdateSystemSettingsDto dto, CancellationToken cancellationToken)
    {
        var settings = await _context.SystemSettings.FirstOrDefaultAsync(cancellationToken);
        if (settings == null)
        {
            settings = new SystemSetting();
            _context.SystemSettings.Add(settings);
        }

        if (!string.IsNullOrWhiteSpace(dto.AcademyName)) settings.AcademyName = dto.AcademyName.Trim();
        if (dto.AcademyLogo != null) settings.AcademyLogo = dto.AcademyLogo;
        if (!string.IsNullOrWhiteSpace(dto.PrimaryColor)) settings.PrimaryColor = dto.PrimaryColor.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SecondaryColor)) settings.SecondaryColor = dto.SecondaryColor.Trim();
        if (!string.IsNullOrWhiteSpace(dto.ContactEmail)) settings.ContactEmail = dto.ContactEmail.Trim();
        if (!string.IsNullOrWhiteSpace(dto.SupportEmail)) settings.SupportEmail = dto.SupportEmail.Trim();
        if (!string.IsNullOrWhiteSpace(dto.FooterText)) settings.FooterText = dto.FooterText.Trim();

        settings.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, settings, message = "System settings updated successfully." });
    }
}
