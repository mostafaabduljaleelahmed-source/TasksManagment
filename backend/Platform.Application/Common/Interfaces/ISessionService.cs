using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Features.Sessions.Dtos;

namespace Platform.Application.Common.Interfaces;

public interface ISessionService
{
    Task<SessionDto> CreateSessionAsync(Guid courseId, CreateSessionDto dto, CancellationToken cancellationToken = default);
    Task<List<SessionDto>> GetCourseSessionsAsync(Guid courseId, Guid userId, string role, CancellationToken cancellationToken = default);
    Task<SessionDto> UnlockSessionAsync(Guid sessionId, CancellationToken cancellationToken = default);
    Task DeleteSessionAsync(Guid sessionId, Guid teacherId, CancellationToken cancellationToken = default);
}
