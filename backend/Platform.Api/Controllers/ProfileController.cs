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

        if (string.IsNullOrWhiteSpace(dto.OldPassword) || string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            return BadRequest(new { message = "Both old and new passwords are required." });
        }

        if (!_hashService.VerifyPassword(dto.OldPassword, user.PasswordHash))
        {
            return BadRequest(new { message = "Incorrect current password." });
        }

        user.PasswordHash = _hashService.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = "Password updated successfully." });
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
