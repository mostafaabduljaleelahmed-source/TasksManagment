using System.Collections.Generic;
using System.Threading.Tasks;

namespace Platform.Application.Common.Interfaces;

public class TestCaseResult
{
    public string Input { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
    public string ActualOutput { get; set; } = string.Empty;
    public string Stdout { get; set; } = string.Empty;
    public string Stderr { get; set; } = string.Empty;
    public int ExitCode { get; set; } = 0;
    public bool Passed { get; set; }
    public string Error { get; set; } = string.Empty;
}

public class ExecutionResult
{
    public bool Passed { get; set; }
    public int PassedCount { get; set; }
    public int TotalCount { get; set; }
    public int ExecutionTimeMs { get; set; }
    public string Feedback { get; set; } = string.Empty;
    public List<TestCaseResult> TestResults { get; set; } = new();
}

public class TestCaseModel
{
    public string Input { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
}

public interface ICodeExecutionService
{
    Task<ExecutionResult> ExecuteAsync(string code, List<TestCaseModel> testCases, int timeoutMs = 3000);
}
