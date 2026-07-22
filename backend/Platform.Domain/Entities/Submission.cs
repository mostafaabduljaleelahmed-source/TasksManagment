using System;

namespace Platform.Domain.Entities;

public class Submission
{
    public Guid Id { get; set; }
    public Guid TaskId { get; set; }
    public ProgrammingTask Task { get; set; } = null!;
    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;
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
    public string TestCaseResultsJson { get; set; } = "[]";
    public int AttemptNumber { get; set; }
    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;
}
