using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Platform.Application.Common.Interfaces;
using Platform.Application.Common.Utils;
using Platform.Application.Features.Courses.Dtos;
using Platform.Domain.Entities;

using System.Collections.Generic;
using System.Linq;
using Microsoft.EntityFrameworkCore;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class CoursesController : ControllerBase
{
    private readonly ICourseService _courseService;
    private readonly IApplicationDbContext _context;

    public CoursesController(ICourseService courseService, IApplicationDbContext context)
    {
        _courseService = courseService;
        _context = context;
    }

    [HttpPost]
    public async Task<IActionResult> CreateCourse([FromBody] CreateCourseDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        if (role != "Admin" && role != "Teacher")
        {
            return Forbid("Only teachers and administrators can create courses.");
        }

        try
        {
            var response = await _courseService.CreateCourseAsync(userId, dto, cancellationToken);
            return Ok(response);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("teacher")]
    public async Task<IActionResult> GetTeacherCourses(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var courses = await _courseService.GetTeacherCoursesAsync(userId, cancellationToken);
        return Ok(courses);
    }

    [HttpGet("student")]
    public async Task<IActionResult> GetStudentCourses(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var courses = await _courseService.GetStudentCoursesAsync(userId, cancellationToken);
        return Ok(courses);
    }

    [HttpPost("join")]
    public async Task<IActionResult> JoinCourse([FromBody] JoinRequestDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        try
        {
            var response = await _courseService.JoinCourseAsync(userId, dto.CourseCode, cancellationToken);
            return Ok(response);
        }
        catch (Exception ex) when (ex is ArgumentException || ex is InvalidOperationException)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{courseId}")]
    public async Task<IActionResult> DeleteCourse(Guid courseId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can delete courses.");
        }

        try
        {
            await _courseService.DeleteCourseAsync(courseId, userId, cancellationToken);
            return Ok(new { message = "Course deleted successfully." });
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
            return BadRequest(new { message = "Cannot delete course due to linked database records.", details = innerMsg });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error deleting course: {ex.Message}" });
        }
    }

    [HttpDelete("{courseId}/students/{studentId}")]
    public async Task<IActionResult> RemoveStudent(Guid courseId, Guid studentId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers and admins can remove students from a course.");
        }

        try
        {
            await _courseService.RemoveStudentAsync(courseId, studentId, userId, cancellationToken);
            return Ok(new { message = "Student removed from course successfully." });
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
            return BadRequest(new { message = "Cannot remove student due to linked database records.", details = innerMsg });
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = $"Error removing student: {ex.Message}" });
        }
    }

    [HttpGet("{courseId}/members")]
    public async Task<IActionResult> GetCourseMembers(Guid courseId, CancellationToken cancellationToken)
    {
        var course = await _context.Courses
            .Include(c => c.Teacher)
            .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

        if (course == null) return NotFound(new { message = "Course not found." });

        var enrollments = await _context.Enrollments
            .Include(e => e.Student)
            .Where(e => e.CourseId == courseId)
            .ToListAsync(cancellationToken);

        var sessions = await _context.Sessions
            .Where(s => s.CourseId == courseId)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var taskIds = tasks.Select(t => t.Id).ToList();

        var submissions = await _context.Submissions
            .Where(s => taskIds.Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var studentMembers = new List<object>();

        foreach (var e in enrollments)
        {
            var student = e.Student;
            var studentSubs = submissions.Where(s => s.StudentId == student.Id).ToList();

            var submittedTaskIds = studentSubs.Select(s => s.TaskId).Distinct().ToList();
            int completedTasks = 0;
            int pendingTasks = 0;
            int missingTasks = 0;

            foreach (var task in tasks)
            {
                var taskSubs = studentSubs.Where(s => s.TaskId == task.Id).ToList();
                if (taskSubs.Any())
                {
                    var latestSub = taskSubs.OrderByDescending(s => s.SubmittedAt).First();
                    if (latestSub.Grade > 0 || !string.IsNullOrWhiteSpace(latestSub.TeacherFeedback))
                    {
                        completedTasks++;
                    }
                    else
                    {
                        pendingTasks++;
                    }
                }
                else if (task.Deadline < DateTime.UtcNow)
                {
                    missingTasks++;
                }
                else
                {
                    pendingTasks++;
                }
            }

            var bestPerTaskPcts = studentSubs
                .GroupBy(s => s.TaskId)
                .Select(g => {
                    var bestSub = g.OrderByDescending(s => s.Grade).First();
                    var taskObj = tasks.FirstOrDefault(t => t.Id == g.Key);
                    return GradeCalculator.CalculatePercentage(bestSub.Grade, taskObj?.MaxGrade ?? 100);
                })
                .ToList();

            double avgGrade = bestPerTaskPcts.Any() ? Math.Round(bestPerTaskPcts.Average(), 1) : 0;
            int totalAssigned = tasks.Count;
            double progress = totalAssigned > 0 ? Math.Round(((double)completedTasks / totalAssigned) * 100, 1) : 0;

            string status = "Not Started";
            if (completedTasks == totalAssigned && totalAssigned > 0)
            {
                status = "Completed";
            }
            else if (completedTasks > 0)
            {
                status = "In Progress";
            }

            var lastSubAt = studentSubs.Any() ? studentSubs.Max(s => s.SubmittedAt) : (DateTime?)null;
            var lastActivityDate = lastSubAt ?? e.EnrolledAt;

            studentMembers.Add(new
            {
                StudentId = student.Id,
                Name = student.Name,
                Email = student.Email,
                StudentRegisterId = student.StudentId ?? "-",
                AvatarUrl = student.AvatarUrl,
                AverageGrade = avgGrade,
                CompletedTasks = completedTasks,
                PendingTasks = pendingTasks,
                MissingTasks = missingTasks,
                TotalTasks = totalAssigned,
                ProgressPercentage = progress,
                Status = status,
                LastActivity = lastActivityDate
            });
        }

        return Ok(new
        {
            CourseId = course.Id,
            CourseName = course.Name,
            CourseCode = course.CourseCode,
            Teacher = new
            {
                Id = course.Teacher.Id,
                Name = course.Teacher.Name,
                Email = course.Teacher.Email,
                AvatarUrl = course.Teacher.AvatarUrl
            },
            Students = studentMembers
        });
    }

    [HttpPost("{courseId}/students/{studentId}/reset-password")]
    public async Task<IActionResult> ResetStudentPassword(
        Guid courseId,
        Guid studentId,
        [FromServices] Platform.Application.Common.Interfaces.IHashService hashService,
        [FromServices] Platform.Application.Common.Interfaces.IEmailService emailService,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid("Only teachers and admins can reset student passwords.");

        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
        if (student == null) return NotFound(new { message = "Student not found." });

        var tempPassword = $"Student#{Random.Shared.Next(1000, 9999)}";
        student.PasswordHash = hashService.HashPassword(tempPassword);
        await _context.SaveChangesAsync(cancellationToken);

        await emailService.SendPasswordResetNotificationAsync(student, tempPassword, cancellationToken);

        return Ok(new { success = true, tempPassword, message = $"Password reset to '{tempPassword}' for {student.Name}." });
    }

    [HttpPost("{courseId}/students/{studentId}/notify")]
    public async Task<IActionResult> SendStudentNotification(
        Guid courseId,
        Guid studentId,
        [FromBody] SendNotificationDto dto,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid("Only teachers and admins can send notifications.");

        if (string.IsNullOrWhiteSpace(dto.Message))
        {
            return BadRequest(new { message = "Notification message is required." });
        }

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = studentId,
            Message = dto.Message.Trim(),
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "Notification sent to student." });
    }

    [HttpPost("{courseId}/assign-teacher")]
    public async Task<IActionResult> AssignTeacher(Guid courseId, [FromBody] AssignTeacherDto dto, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin") return Forbid("Only the Administrator can assign teachers to courses.");

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);
        if (course == null) return NotFound(new { message = "Course not found." });

        var teacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.TeacherId && u.Role == Domain.Enums.UserRole.Teacher, cancellationToken);
        if (teacher == null) return BadRequest(new { message = "Target teacher not found." });

        course.TeacherId = dto.TeacherId;
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = $"Teacher '{teacher.Name}' assigned to course '{course.Name}'." });
    }

    [HttpPut("{courseId}")]
    public async Task<IActionResult> UpdateCourse(Guid courseId, [FromBody] UpdateCourseDto dto, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);
        if (course == null) return NotFound(new { message = "Course not found." });

        if (role != "Admin" && course.TeacherId != userId)
        {
            var isCollaborator = await _context.CourseTeachers.AnyAsync(ct => ct.CourseId == courseId && ct.TeacherId == userId, cancellationToken);
            if (!isCollaborator) return Forbid("You can only edit your own groups.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Name)) course.Name = dto.Name.Trim();
        if (dto.Description != null) course.Description = dto.Description.Trim();
        if (!string.IsNullOrWhiteSpace(dto.CourseCode))
        {
            var normalizedCode = dto.CourseCode.Trim().ToUpperInvariant();
            var codeExists = await _context.Courses.AnyAsync(c => c.CourseCode == normalizedCode && c.Id != courseId, cancellationToken);
            if (codeExists) return BadRequest(new { message = $"Course code '{normalizedCode}' is already in use." });
            course.CourseCode = normalizedCode;
        }

        if (role == "Admin" && dto.TeacherId.HasValue)
        {
            var targetTeacher = await _context.Users.FirstOrDefaultAsync(u => u.Id == dto.TeacherId.Value && u.Role == Domain.Enums.UserRole.Teacher, cancellationToken);
            if (targetTeacher != null) course.TeacherId = dto.TeacherId.Value;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Group updated successfully.", course });
    }

    [HttpPost("{courseId}/duplicate")]
    public async Task<IActionResult> DuplicateCourse(Guid courseId, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User not found." });
        }

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);
        if (course == null) return NotFound(new { message = "Course not found." });

        if (role != "Admin" && course.TeacherId != userId)
        {
            return Forbid("Only group teachers or admins can duplicate this group.");
        }

        string newCode;
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        do
        {
            newCode = new string(Enumerable.Repeat(chars, 6).Select(s => s[random.Next(s.Length)]).ToArray());
        } while (await _context.Courses.AnyAsync(c => c.CourseCode == newCode, cancellationToken));

        var dupCourse = new Course
        {
            Id = Guid.NewGuid(),
            Name = $"{course.Name} (Copy)",
            Description = course.Description,
            CourseCode = newCode,
            TeacherId = course.TeacherId,
            CreatedAt = DateTime.UtcNow,
            IsArchived = false
        };

        _context.Courses.Add(dupCourse);
        _context.CourseTeachers.Add(new CourseTeacher
        {
            CourseId = dupCourse.Id,
            TeacherId = course.TeacherId,
            AssignedAt = DateTime.UtcNow
        });

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = $"Group duplicated as '{dupCourse.Name}' (Code: {dupCourse.CourseCode}).", course = dupCourse });
    }

    [HttpPost("{courseId}/restore")]
    public async Task<IActionResult> RestoreCourse(Guid courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid("Only teachers and admins can restore groups.");

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);
        if (course == null) return NotFound(new { message = "Course not found." });

        course.IsArchived = false;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = $"Group '{course.Name}' restored from archive." });
    }
}

public class AssignTeacherDto
{
    public Guid TeacherId { get; set; }
}

public class SendNotificationDto
{
    public string Message { get; set; } = string.Empty;
}

public class JoinRequestDto
{
    public string CourseCode { get; set; } = string.Empty;
}

public class UpdateCourseDto
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? CourseCode { get; set; }
    public Guid? TeacherId { get; set; }
}
