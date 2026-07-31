using System;
using System.Linq;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Infrastructure.Persistence;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class ArchiveController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ArchiveController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetArchivedItems(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId) || (role != "Teacher" && role != "Admin"))
        {
            return Forbid("Only teachers and admins can access archived items.");
        }

        // Teacher/Admin courses
        var courses = await _context.Courses
            .Where(c => (role == "Admin" || c.TeacherId == teacherId) && c.IsArchived)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                courseCode = c.CourseCode,
                description = c.Description,
                createdAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // Teacher/Admin course IDs
        var teacherCourseIds = await _context.Courses
            .Where(c => role == "Admin" || c.TeacherId == teacherId)
            .Select(c => c.Id)
            .ToListAsync(cancellationToken);

        // Archived Sessions
        var sessions = await _context.Sessions
            .Include(s => s.Course)
            .Where(s => teacherCourseIds.Contains(s.CourseId) && s.IsArchived)
            .Select(s => new
            {
                id = s.Id,
                title = s.Title,
                order = s.Order,
                courseId = s.CourseId,
                courseName = s.Course.Name,
                createdAt = s.CreatedAt
            })
            .ToListAsync(cancellationToken);

        // Teacher/Admin session IDs
        var teacherSessionIds = await _context.Sessions
            .Where(s => teacherCourseIds.Contains(s.CourseId))
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        // Archived Assignments (ProgrammingTasks)
        var assignments = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .ThenInclude(sess => sess.Course)
            .Where(t => teacherSessionIds.Contains(t.SessionId) && t.IsArchived)
            .Select(t => new
            {
                id = t.Id,
                title = t.Title,
                courseId = t.Session.CourseId,
                courseName = t.Session.Course.Name,
                sessionName = t.Session.Title,
                deadline = t.Deadline,
                maxGrade = t.MaxGrade,
                createdAt = t.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            courses,
            sessions,
            assignments
        });
    }

    [HttpPost("course/{id}/archive")]
    public async Task<IActionResult> ArchiveCourse(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin") return Forbid();

        var course = await _context.Courses.FindAsync(new object[] { id }, cancellationToken);
        if (course == null) return NotFound(new { message = "Course not found." });

        course.IsArchived = true;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Course archived successfully." });
    }

    [HttpPost("course/{id}/restore")]
    public async Task<IActionResult> RestoreCourse(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Admin") return Forbid();

        var course = await _context.Courses.FindAsync(new object[] { id }, cancellationToken);
        if (course == null) return NotFound(new { message = "Course not found." });

        course.IsArchived = false;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Course restored successfully." });
    }

    [HttpPost("session/{id}/archive")]
    public async Task<IActionResult> ArchiveSession(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();

        var session = await _context.Sessions.FindAsync(new object[] { id }, cancellationToken);
        if (session == null) return NotFound(new { message = "Session not found." });

        session.IsArchived = true;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Session archived successfully." });
    }

    [HttpPost("session/{id}/restore")]
    public async Task<IActionResult> RestoreSession(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();

        var session = await _context.Sessions.FindAsync(new object[] { id }, cancellationToken);
        if (session == null) return NotFound(new { message = "Session not found." });

        session.IsArchived = false;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Session restored successfully." });
    }

    [HttpPost("task/{id}/archive")]
    public async Task<IActionResult> ArchiveTask(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();

        var task = await _context.ProgrammingTasks.FindAsync(new object[] { id }, cancellationToken);
        if (task == null) return NotFound(new { message = "Task not found." });

        task.IsArchived = true;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Task archived successfully." });
    }

    [HttpPost("task/{id}/restore")]
    public async Task<IActionResult> RestoreTask(Guid id, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin") return Forbid();

        var task = await _context.ProgrammingTasks.FindAsync(new object[] { id }, cancellationToken);
        if (task == null) return NotFound(new { message = "Task not found." });

        task.IsArchived = false;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, message = "Task restored successfully." });
    }
}
