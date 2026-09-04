using System;

namespace Platform.Application.Features.Tasks.Dtos;

public class GenerateTasksRequestDto
{
    public string Topic { get; set; } = string.Empty;
    public int Count { get; set; } = 3;
    public string Type { get; set; } = "ProgrammingChallenge"; // "BasicExercise", "InputExercise", "ProgrammingChallenge"
    public string Language { get; set; } = "python";
    public string Mode { get; set; } = "Homework"; // "InClass" or "Homework"
    public int MaxGrade { get; set; } = 100;
    public DateTime Deadline { get; set; }
}

public class GeneratedTaskDraftDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ExampleInput { get; set; } = string.Empty;
    public string ExampleOutput { get; set; } = string.Empty;
    public string PublicTestCasesJson { get; set; } = "[]";
    public string HiddenTestCasesJson { get; set; } = "[]";
}
