using System;

namespace Platform.Application.Features.Tasks.Dtos;

public class ProgrammingTaskDto
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ExampleInput { get; set; } = string.Empty;
    public string ExampleOutput { get; set; } = string.Empty;
    public string PublicTestCasesJson { get; set; } = "[]";
    public DateTime Deadline { get; set; }
    public int MaxGrade { get; set; }
    public string Mode { get; set; } = "Homework"; // "InClass" or "Homework"
    public int MaxAttempts { get; set; }
    public bool RunHiddenTestCases { get; set; }
    public string Type { get; set; } = "ProgrammingChallenge"; // "BasicExercise", "InputExercise", "ProgrammingChallenge"
    public int TimeLimitMs { get; set; }
    public int MemoryLimitMb { get; set; }
    public string GradingStrategy { get; set; } = "Educational"; // "Exact" or "Educational"
    public string EvaluationMode { get; set; } = "ManualReview"; // "ManualReview" or "AutomaticGrading"
    public string Language { get; set; } = "python";
    public bool IgnoreMultipleSpaces { get; set; } = true;
}

public class CreateProgrammingTaskDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ExampleInput { get; set; } = string.Empty;
    public string ExampleOutput { get; set; } = string.Empty;
    public string PublicTestCasesJson { get; set; } = "[]";
    public string HiddenTestCasesJson { get; set; } = "[]";
    public DateTime Deadline { get; set; }
    public int MaxGrade { get; set; }
    public string Mode { get; set; } = "Homework"; // "InClass" or "Homework"
    public int MaxAttempts { get; set; } = 3;
    public bool RunHiddenTestCases { get; set; } = true;
    public string Type { get; set; } = "ProgrammingChallenge"; // "BasicExercise", "InputExercise", "ProgrammingChallenge"
    public int TimeLimitMs { get; set; } = 3000;
    public int MemoryLimitMb { get; set; } = 256;
    public string GradingStrategy { get; set; } = "Educational"; // "Exact" or "Educational"
    public string EvaluationMode { get; set; } = "ManualReview"; // "ManualReview" or "AutomaticGrading"
    public string Language { get; set; } = "python";
    public bool IgnoreMultipleSpaces { get; set; } = true;
}
