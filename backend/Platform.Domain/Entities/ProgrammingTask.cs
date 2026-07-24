using System;
using System.Collections.Generic;
using Platform.Domain.Enums;

namespace Platform.Domain.Entities;

public class ProgrammingTask
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public Session Session { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ExampleInput { get; set; } = string.Empty;
    public string ExampleOutput { get; set; } = string.Empty;
    public string PublicTestCasesJson { get; set; } = "[]";
    public string HiddenTestCasesJson { get; set; } = "[]";
    public DateTime Deadline { get; set; }
    public int MaxGrade { get; set; }
    public ProgrammingTaskMode Mode { get; set; } = ProgrammingTaskMode.Homework;
    public int MaxAttempts { get; set; } = 3; // Applicable to Homework mode
    public bool RunHiddenTestCases { get; set; } = true;
    public ProgrammingTaskType Type { get; set; } = ProgrammingTaskType.ProgrammingChallenge;
    public int TimeLimitMs { get; set; } = 3000;
    public int MemoryLimitMb { get; set; } = 256;
    public GradingStrategy GradingStrategy { get; set; } = GradingStrategy.Educational;
    public EvaluationMode EvaluationMode { get; set; } = EvaluationMode.ManualReview;
    public string Language { get; set; } = "python";
    public bool IgnoreMultipleSpaces { get; set; } = true;
    public string AttachmentsJson { get; set; } = "[]";
    public bool IsArchived { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Submission> Submissions { get; set; } = new List<Submission>();
}
