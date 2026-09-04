using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Features.Tasks.Dtos;

namespace Platform.Application.Common.Interfaces;

public interface IAiTaskGeneratorService
{
    Task<List<GeneratedTaskDraftDto>> GenerateDraftsAsync(GenerateTasksRequestDto request, CancellationToken cancellationToken = default);
}
