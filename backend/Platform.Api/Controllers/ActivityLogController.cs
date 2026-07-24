using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Infrastructure.Persistence;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/activity-logs")]
public class ActivityLogController : ControllerBase
{
    private readonly ApplicationDbContext _context;

    public ActivityLogController(ApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<IActionResult> GetActivityLogs(CancellationToken cancellationToken)
    {
        var logs = await _context.ActivityLogs
            .Include(a => a.User)
            .OrderByDescending(a => a.Timestamp)
            .Take(200)
            .Select(a => new
            {
                id = a.Id,
                timestamp = a.Timestamp,
                userId = a.UserId,
                userName = a.User.Name,
                userRole = a.User.Role.ToString(),
                userAvatarUrl = a.User.AvatarUrl,
                action = a.Action,
                details = a.Details,
                courseId = a.CourseId,
                courseName = a.CourseName,
                taskId = a.TaskId,
                taskTitle = a.TaskTitle
            })
            .ToListAsync(cancellationToken);

        return Ok(logs);
    }
}
