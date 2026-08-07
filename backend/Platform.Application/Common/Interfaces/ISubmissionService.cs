using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Features.Submissions.Dtos;

namespace Platform.Application.Common.Interfaces;

public interface ISubmissionService
{
    Task<RunResultDto> RunCodeAsync(Guid taskId, RunCodeDto dto, CancellationToken cancellationToken = default);
    Task<SubmissionDto> SubmitCodeAsync(Guid studentId, Guid taskId, SubmitCodeDto dto, CancellationToken cancellationToken = default);
    Task<List<SubmissionDto>> GetStudentTaskSubmissionsAsync(Guid studentId, Guid taskId, CancellationToken cancellationToken = default);
    Task<List<SubmissionDto>> GetTaskSubmissionsAsync(Guid taskId, CancellationToken cancellationToken = default);
    Task<object> GetTaskSubmissionsStatsAsync(Guid taskId, CancellationToken cancellationToken = default);
    Task<object> GetStudentTaskStatsAsync(Guid studentId, Guid taskId, CancellationToken cancellationToken = default);
    Task<SubmissionDto> ReviewSubmissionAsync(Guid submissionId, ReviewSubmissionDto dto, CancellationToken cancellationToken = default);
    Task<SubmissionDto> EditSubmissionReviewAsync(Guid submissionId, ReviewSubmissionDto dto, CancellationToken cancellationToken = default);
    Task<SubmissionDto> ResetSubmissionReviewAsync(Guid submissionId, CancellationToken cancellationToken = default);
    Task<int> ResetAllSubmissionsAsync(CancellationToken cancellationToken = default);
    Task<int> ResetStudentSubmissionsAsync(Guid studentId, CancellationToken cancellationToken = default);
    Task<int> ResetTaskSubmissionsAsync(Guid taskId, CancellationToken cancellationToken = default);
    Task<int> ResetCourseSubmissionsAsync(Guid courseId, CancellationToken cancellationToken = default);
    Task<int> ResetPlatformSubmissionsAsync(CancellationToken cancellationToken = default);
}
