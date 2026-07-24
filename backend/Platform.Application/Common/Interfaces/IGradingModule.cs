using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Application.Common.Interfaces;

public class GradingContext
{
    public ProgrammingTask Task { get; set; } = null!;
    public Guid StudentId { get; set; }
    public string Code { get; set; } = string.Empty;
    public int AttemptNumber { get; set; }
}

public class TestCaseExecutionDetail
{
    public int CaseNumber { get; set; }
    public bool IsHidden { get; set; }
    public string Input { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
    public string ActualOutput { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public string StatusDescription { get; set; } = string.Empty;
    public double ExecutionTimeSeconds { get; set; }
}

public class GradingResult
{
    public int Grade { get; set; }
    public string ExecutionStatus { get; set; } = "Accepted"; // Accepted, WrongAnswer, TimeLimitExceeded, CompilationError, PendingEvaluation
    public string ConsoleOutput { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
    public int PassedPublicCases { get; set; }
    public int TotalPublicCases { get; set; }
    public int PassedHiddenCases { get; set; }
    public int TotalHiddenCases { get; set; }
    public int ExecutionTimeMs { get; set; }
    public string TestCaseResultsJson { get; set; } = "[]";
    public string Feedback { get; set; } = string.Empty;
    public bool IsServiceUnavailable { get; set; }
}

public interface IGradingModule
{
    string ModuleName { get; }
    bool CanHandle(EvaluationMode mode);
    Task<GradingResult> GradeAsync(GradingContext context, CancellationToken cancellationToken = default);
}

public interface IGradingEngineDispatcher
{
    Task<GradingResult> DispatchAsync(GradingContext context, CancellationToken cancellationToken = default);
}
