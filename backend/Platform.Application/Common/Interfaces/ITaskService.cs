using System;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Features.Tasks.Dtos;

namespace Platform.Application.Common.Interfaces;

public interface ITaskService
{
    Task<ProgrammingTaskDto> CreateTaskAsync(Guid sessionId, CreateProgrammingTaskDto dto, CancellationToken cancellationToken = default);
    Task<ProgrammingTaskDto> GetTaskByIdAsync(Guid taskId, Guid userId, string role, CancellationToken cancellationToken = default);
    Task DeleteTaskAsync(Guid taskId, Guid teacherId, CancellationToken cancellationToken = default);
}
