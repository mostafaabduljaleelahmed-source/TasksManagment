using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Enums;

namespace Platform.Application.Services.Grading;

public class ManualReviewModule : IGradingModule
{
    private readonly IExecutionService _executionService;
    private readonly ILanguageRegistry _languageRegistry;

    public string ModuleName => "ManualReviewModule";

    public ManualReviewModule(IExecutionService executionService, ILanguageRegistry languageRegistry)
    {
        _executionService = executionService;
        _languageRegistry = languageRegistry;
    }

    public bool CanHandle(EvaluationMode mode)
    {
        return mode == EvaluationMode.ManualReview;
    }

    public async Task<GradingResult> GradeAsync(GradingContext context, CancellationToken cancellationToken = default)
    {
        var langDef = _languageRegistry.GetLanguage(context.Task.Language);
        var sampleInput = context.Task.ExampleInput ?? string.Empty;

        var request = new Judge0ExecutionRequest
        {
            SourceCode = context.Code,
            LanguageId = langDef != null ? langDef.Judge0LanguageId : 71,
            Stdin = sampleInput,
            ExpectedOutput = string.Empty,
            CpuTimeLimitSeconds = context.Task.TimeLimitMs > 0 ? context.Task.TimeLimitMs / 1000.0 : 3.0,
            MemoryLimitKb = context.Task.MemoryLimitMb > 0 ? context.Task.MemoryLimitMb * 1024 : 256000
        };

        var execResult = await _executionService.ExecuteAsync(request, cancellationToken);

        string stdout = execResult.Stdout ?? string.Empty;
        string stderr = !string.IsNullOrEmpty(execResult.CompileOutput) ? execResult.CompileOutput : (execResult.Stderr ?? string.Empty);

        var result = new GradingResult
        {
            Grade = 0,
            ExecutionStatus = "PendingEvaluation",
            ConsoleOutput = stdout,
            ExpectedOutput = stderr,
            PassedPublicCases = 0,
            TotalPublicCases = 0,
            PassedHiddenCases = 0,
            TotalHiddenCases = 0,
            ExecutionTimeMs = (int)(execResult.TimeSeconds * 1000.0),
            TestCaseResultsJson = "[]",
            Feedback = "Submission received and queued for manual instructor evaluation and grading."
        };

        return result;
    }
}
