using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;

namespace Platform.Application.Services.Grading;

public class GradingEngineDispatcher : IGradingEngineDispatcher
{
    private readonly IEnumerable<IGradingModule> _modules;

    public GradingEngineDispatcher(IEnumerable<IGradingModule> modules)
    {
        _modules = modules;
    }

    public async Task<GradingResult> DispatchAsync(GradingContext context, CancellationToken cancellationToken = default)
    {
        if (context == null || context.Task == null)
        {
            throw new ArgumentNullException(nameof(context), "Grading context or task cannot be null.");
        }

        var targetMode = context.Task.EvaluationMode;
        var module = _modules.FirstOrDefault(m => m.CanHandle(targetMode));

        if (module == null)
        {
            // Fallback to manual review module if no specific module handles the evaluation mode
            module = _modules.FirstOrDefault(m => m.ModuleName == "ManualReviewModule")
                ?? throw new InvalidOperationException($"No suitable grading module found for EvaluationMode: {targetMode}");
        }

        return await module.GradeAsync(context, cancellationToken);
    }
}
