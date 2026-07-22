using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Enums;

namespace Platform.Application.Services.Grading;

public class TestCaseItem
{
    public string Input { get; set; } = string.Empty;
    public string Output { get; set; } = string.Empty;
}

public class Judge0AutoGradingModule : IGradingModule
{
    private readonly IExecutionService _executionService;
    private readonly ILanguageRegistry _languageRegistry;

    public string ModuleName => "Judge0AutoGradingModule";

    public Judge0AutoGradingModule(IExecutionService executionService, ILanguageRegistry languageRegistry)
    {
        _executionService = executionService;
        _languageRegistry = languageRegistry;
    }

    public bool CanHandle(EvaluationMode mode)
    {
        return mode == EvaluationMode.AutomaticGrading;
    }

    public async Task<GradingResult> GradeAsync(GradingContext context, CancellationToken cancellationToken = default)
    {
        var langDef = _languageRegistry.GetLanguage(context.Task.Language);
        var publicCases = ParseTestCases(context.Task.PublicTestCasesJson);
        var hiddenCases = context.Task.RunHiddenTestCases ? ParseTestCases(context.Task.HiddenTestCasesJson) : new List<TestCaseItem>();

        var testCaseDetails = new List<TestCaseExecutionDetail>();
        int passedPublic = 0;
        int passedHidden = 0;
        int totalPublic = publicCases.Count;
        int totalHidden = hiddenCases.Count;
        double maxTimeSeconds = 0;
        string overallStatus = "Accepted";
        string firstConsoleOutput = string.Empty;
        string firstExpectedOutput = string.Empty;

        int caseCounter = 1;

        // Process Public Test Cases
        foreach (var tc in publicCases)
        {
            var req = new Judge0ExecutionRequest
            {
                SourceCode = context.Code,
                LanguageId = langDef.Judge0LanguageId,
                Stdin = tc.Input,
                ExpectedOutput = tc.Output,
                CpuTimeLimitSeconds = context.Task.TimeLimitMs > 0 ? context.Task.TimeLimitMs / 1000.0 : 3.0,
                MemoryLimitKb = context.Task.MemoryLimitMb > 0 ? context.Task.MemoryLimitMb * 1024 : 256000
            };

            var execRes = await _executionService.ExecuteAsync(req, cancellationToken);
            if (execRes.TimeSeconds > maxTimeSeconds) maxTimeSeconds = execRes.TimeSeconds;

            bool passed = execRes.Passed || (execRes.Stdout.Trim().Equals(tc.Output.Trim(), StringComparison.OrdinalIgnoreCase));
            if (passed) passedPublic++;
            else if (overallStatus == "Accepted") overallStatus = execRes.StatusDescription;

            if (string.IsNullOrEmpty(firstConsoleOutput))
            {
                firstConsoleOutput = string.IsNullOrEmpty(execRes.Stderr) ? execRes.Stdout : execRes.Stderr;
                firstExpectedOutput = tc.Output;
            }

            testCaseDetails.Add(new TestCaseExecutionDetail
            {
                CaseNumber = caseCounter++,
                IsHidden = false,
                Input = tc.Input,
                ExpectedOutput = tc.Output,
                ActualOutput = execRes.Stdout,
                Passed = passed,
                StatusDescription = passed ? "Passed" : (string.IsNullOrEmpty(execRes.StatusDescription) ? "Wrong Answer" : execRes.StatusDescription),
                ExecutionTimeSeconds = execRes.TimeSeconds
            });
        }

        // Process Hidden Test Cases
        foreach (var tc in hiddenCases)
        {
            var req = new Judge0ExecutionRequest
            {
                SourceCode = context.Code,
                LanguageId = langDef.Judge0LanguageId,
                Stdin = tc.Input,
                ExpectedOutput = tc.Output,
                CpuTimeLimitSeconds = context.Task.TimeLimitMs > 0 ? context.Task.TimeLimitMs / 1000.0 : 3.0,
                MemoryLimitKb = context.Task.MemoryLimitMb > 0 ? context.Task.MemoryLimitMb * 1024 : 256000
            };

            var execRes = await _executionService.ExecuteAsync(req, cancellationToken);
            if (execRes.TimeSeconds > maxTimeSeconds) maxTimeSeconds = execRes.TimeSeconds;

            bool passed = execRes.Passed || (execRes.Stdout.Trim().Equals(tc.Output.Trim(), StringComparison.OrdinalIgnoreCase));
            if (passed) passedHidden++;
            else if (overallStatus == "Accepted") overallStatus = execRes.StatusDescription;

            testCaseDetails.Add(new TestCaseExecutionDetail
            {
                CaseNumber = caseCounter++,
                IsHidden = true,
                Input = "Hidden Input",
                ExpectedOutput = "Hidden Output",
                ActualOutput = passed ? "Match" : "Mismatch",
                Passed = passed,
                StatusDescription = passed ? "Passed" : (string.IsNullOrEmpty(execRes.StatusDescription) ? "Wrong Answer" : execRes.StatusDescription),
                ExecutionTimeSeconds = execRes.TimeSeconds
            });
        }

        // Calculate Grade
        int totalCases = totalPublic + totalHidden;
        int passedTotal = passedPublic + passedHidden;
        int calculatedGrade = context.Task.MaxGrade;

        if (totalCases > 0)
        {
            double ratio = (double)passedTotal / totalCases;
            calculatedGrade = (int)Math.Round(ratio * context.Task.MaxGrade);
        }

        string feedbackText = passedTotal == totalCases
            ? $"Automatic Evaluation: Passed all {totalCases} test cases successfully ({langDef.DisplayName})."
            : $"Automatic Evaluation: Passed {passedTotal} of {totalCases} test cases ({langDef.DisplayName}). Status: {overallStatus}.";

        return new GradingResult
        {
            Grade = calculatedGrade,
            ExecutionStatus = passedTotal == totalCases ? "Accepted" : overallStatus,
            ConsoleOutput = firstConsoleOutput,
            ExpectedOutput = firstExpectedOutput,
            PassedPublicCases = passedPublic,
            TotalPublicCases = totalPublic,
            PassedHiddenCases = passedHidden,
            TotalHiddenCases = totalHidden,
            ExecutionTimeMs = (int)(maxTimeSeconds * 1000),
            TestCaseResultsJson = JsonSerializer.Serialize(testCaseDetails),
            Feedback = feedbackText
        };
    }

    private static List<TestCaseItem> ParseTestCases(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<TestCaseItem>();
        try
        {
            return JsonSerializer.Deserialize<List<TestCaseItem>>(json, new JsonSerializerOptions { PropertyNameCaseInsensitive = true }) ?? new List<TestCaseItem>();
        }
        catch
        {
            return new List<TestCaseItem>();
        }
    }
}
