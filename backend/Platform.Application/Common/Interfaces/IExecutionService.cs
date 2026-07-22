using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace Platform.Application.Common.Interfaces;

public class Judge0ExecutionRequest
{
    public string SourceCode { get; set; } = string.Empty;
    public int LanguageId { get; set; } = 71; // Python 3 default
    public string Stdin { get; set; } = string.Empty;
    public string ExpectedOutput { get; set; } = string.Empty;
    public double CpuTimeLimitSeconds { get; set; } = 3.0;
    public int MemoryLimitKb { get; set; } = 256000;
}

public class Judge0ExecutionResult
{
    public int StatusId { get; set; } // 3 = Accepted, 4 = Wrong Answer, 5 = Time Limit Exceeded, 6 = Compilation Error, etc.
    public string StatusDescription { get; set; } = string.Empty;
    public string Stdout { get; set; } = string.Empty;
    public string Stderr { get; set; } = string.Empty;
    public string CompileOutput { get; set; } = string.Empty;
    public double TimeSeconds { get; set; }
    public int MemoryKb { get; set; }
    public bool Passed { get; set; }
}

public interface IExecutionService
{
    Task<Judge0ExecutionResult> ExecuteAsync(Judge0ExecutionRequest request, CancellationToken cancellationToken = default);
    Task<List<Judge0ExecutionResult>> ExecuteBatchAsync(List<Judge0ExecutionRequest> requests, CancellationToken cancellationToken = default);
}
