using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Enums;

namespace Platform.Application.Services.Grading;

public class ManualReviewModule : IGradingModule
{
    private readonly ICodeExecutionService _executionService;

    public string ModuleName => "ManualReviewModule";

    public ManualReviewModule(ICodeExecutionService executionService)
    {
        _executionService = executionService;
    }

    public bool CanHandle(EvaluationMode mode)
    {
        return mode == EvaluationMode.ManualReview;
    }

    public async Task<GradingResult> GradeAsync(GradingContext context, CancellationToken cancellationToken = default)
    {
        var sampleInput = context.Task.ExampleInput ?? string.Empty;
        var testCases = new List<TestCaseModel>
        {
            new TestCaseModel { Input = sampleInput, ExpectedOutput = string.Empty }
        };

        var execResult = await _executionService.ExecuteAsync(
            context.Code,
            testCases,
            context.Task.TimeLimitMs > 0 ? context.Task.TimeLimitMs : 3000
        );

        var firstCase = execResult.TestResults.FirstOrDefault();

        string stdout = firstCase?.Stdout ?? string.Empty;
        string stderr = firstCase?.Stderr ?? (firstCase?.Error ?? string.Empty);

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
            ExecutionTimeMs = execResult.ExecutionTimeMs,
            TestCaseResultsJson = "[]",
            Feedback = "Submission received and queued for manual instructor evaluation and grading."
        };

        return result;
    }
}
