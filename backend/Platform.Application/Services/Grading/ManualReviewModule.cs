using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Enums;

namespace Platform.Application.Services.Grading;

public class ManualReviewModule : IGradingModule
{
    public string ModuleName => "ManualReviewModule";

    public bool CanHandle(EvaluationMode mode)
    {
        return mode == EvaluationMode.ManualReview;
    }

    public Task<GradingResult> GradeAsync(GradingContext context, CancellationToken cancellationToken = default)
    {
        var result = new GradingResult
        {
            Grade = 0,
            ExecutionStatus = "PendingEvaluation",
            ConsoleOutput = "Submitted for manual evaluation.",
            ExpectedOutput = string.Empty,
            PassedPublicCases = 0,
            TotalPublicCases = 0,
            PassedHiddenCases = 0,
            TotalHiddenCases = 0,
            ExecutionTimeMs = 0,
            TestCaseResultsJson = "[]",
            Feedback = "Submission received and queued for manual instructor evaluation and grading."
        };

        return Task.FromResult(result);
    }
}
