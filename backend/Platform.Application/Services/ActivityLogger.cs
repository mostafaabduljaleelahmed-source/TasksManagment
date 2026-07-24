using System;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Entities;

namespace Platform.Application.Services;

public class ActivityLogger : IActivityLogger
{
    private readonly IApplicationDbContext _context;

    public ActivityLogger(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        Guid userId,
        string action,
        string details,
        Guid? courseId = null,
        string? courseName = null,
        Guid? taskId = null,
        string? taskTitle = null,
        CancellationToken cancellationToken = default)
    {
        var log = new ActivityLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Action = action,
            Details = details,
            CourseId = courseId,
            CourseName = courseName,
            TaskId = taskId,
            TaskTitle = taskTitle,
            Timestamp = DateTime.UtcNow
        };

        _context.ActivityLogs.Add(log);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
