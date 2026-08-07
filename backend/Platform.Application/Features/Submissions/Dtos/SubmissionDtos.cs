using System;
using System.Collections.Generic;

namespace Platform.Application.Features.Submissions.Dtos;

public class SubmitCodeDto
{
    public string Code { get; set; } = string.Empty;
}

public class RunCodeDto
{
    public string Code { get; set; } = string.Empty;
    public string Input { get; set; } = string.Empty;
}

public class RunResultDetailsDto
{
    public string Input { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
    public string ActualOutput { get; set; } = string.Empty;
    public bool Passed { get; set; }
    public string Error { get; set; } = string.Empty;
}

public class RunResultDto
{
    public bool Passed { get; set; }
    public int PassedCount { get; set; }
    public int TotalCount { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public List<RunResultDetailsDto> Details { get; set; } = new();
    public string Stdout { get; set; } = string.Empty;
    public string Stderr { get; set; } = string.Empty;
    public string Error { get; set; } = string.Empty;
    public int ExecutionTimeMs { get; set; }
}

public class SubmissionDto
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public string TaskTitle { get; set; } = string.Empty;
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public int Grade { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public string TeacherFeedback { get; set; } = string.Empty;
    public string TeacherNotes { get; set; } = string.Empty;
    public double? SimilarityScore { get; set; }
    public string? ComparisonReport { get; set; }
    public string? ConsoleOutput { get; set; }
    public string? ExpectedOutput { get; set; }
    public int PassedPublicCases { get; set; }
    public int TotalPublicCases { get; set; }
    public int PassedHiddenCases { get; set; }
    public int TotalHiddenCases { get; set; }
    public int ExecutionTimeMs { get; set; }
    public string ExecutionStatus { get; set; } = "PendingEvaluation";
    public string Status { get; set; } = "Pending";
    public bool IsReviewed { get; set; } = false;
    public DateTime? ReviewedAt { get; set; }
    public string TestCaseResultsJson { get; set; } = "[]";
    public int AttemptNumber { get; set; }
    public DateTime SubmittedAt { get; set; }
}

public class ReviewSubmissionDto
{
    public int Grade { get; set; }
    public string TeacherFeedback { get; set; } = string.Empty;
    public string TeacherNotes { get; set; } = string.Empty;
}
