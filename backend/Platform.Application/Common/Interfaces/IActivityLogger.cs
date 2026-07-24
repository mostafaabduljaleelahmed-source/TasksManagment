using System;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.Application.Common.Interfaces;

public interface IActivityLogger
{
    Task LogAsync(
        Guid userId,
        string action,
        string details,
        Guid? courseId = null,
        string? courseName = null,
        Guid? taskId = null,
        string? taskTitle = null,
        CancellationToken cancellationToken = default);
}
