using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Threading.Tasks;
using Platform.Application.Common.Interfaces;

namespace Platform.Infrastructure.Execution;

public class PythonExecutionService : ICodeExecutionService
{
    public async Task<ExecutionResult> ExecuteAsync(string code, List<TestCaseModel> testCases, int timeoutMs = 3000)
    {
        var result = new ExecutionResult();
        var tempFolder = Path.Combine(AppContext.BaseDirectory, "temp_runs");
        
        if (!Directory.Exists(tempFolder))
        {
            Directory.CreateDirectory(tempFolder);
        }

        var fileName = Path.Combine(tempFolder, $"{Guid.NewGuid()}.py");
        await File.WriteAllTextAsync(fileName, code);

        var stopwatch = new Stopwatch();
        stopwatch.Start();

        try
        {
            foreach (var tc in testCases)
            {
                var tcResult = await RunTestCaseAsync(fileName, tc, timeoutMs);
                result.TestResults.Add(tcResult);
            }
        }
        finally
        {
            // Clean up temporary script
            if (File.Exists(fileName))
            {
                try { File.Delete(fileName); } catch { /* ignore */ }
            }
        }

        stopwatch.Stop();
        result.ExecutionTimeMs = (int)stopwatch.ElapsedMilliseconds;

        // Calculate statistics
        result.TotalCount = result.TestResults.Count;
        result.PassedCount = result.TestResults.TrueForAll(r => r.Passed) ? result.TotalCount : result.TestResults.FindAll(r => r.Passed).Count;
        result.Passed = result.PassedCount == result.TotalCount && result.TotalCount > 0;
        
        if (!result.Passed)
        {
            result.Feedback = "Some test cases failed.";
        }
        else
        {
            result.Feedback = "All test cases passed successfully!";
        }

        return result;
    }

    private async Task<TestCaseResult> RunTestCaseAsync(string scriptPath, TestCaseModel testCase, int timeoutMs)
    {
        var tcResult = new TestCaseResult
        {
            Input = testCase.Input,
            ExpectedOutput = testCase.ExpectedOutput
        };

        try
        {
            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = "python",
                Arguments = $"\"{scriptPath}\"",
                RedirectStandardInput = true,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            process.Start();

            // Feed input to stdin
            if (!string.IsNullOrEmpty(testCase.Input))
            {
                await process.StandardInput.WriteAsync(testCase.Input);
                await process.StandardInput.FlushAsync();
                process.StandardInput.Close();
            }

            // Read output and error (timeout after custom timeoutMs)
            var readOutputTask = process.StandardOutput.ReadToEndAsync();
            var readErrorTask = process.StandardError.ReadToEndAsync();

            var timeoutTask = Task.Delay(timeoutMs);
            var completedTask = await Task.WhenAny(Task.WhenAll(readOutputTask, readErrorTask), timeoutTask);

            if (completedTask == timeoutTask)
            {
                // Timeout exceeded
                try { process.Kill(true); } catch { /* ignore */ }
                tcResult.Passed = false;
                tcResult.Error = $"Time Limit Exceeded ({timeoutMs / 1000.0} seconds limit). Check for infinite loops.";
                tcResult.ActualOutput = string.Empty;
                return tcResult;
            }

            await process.WaitForExitAsync();

            var stdout = await readOutputTask;
            var stderr = await readErrorTask;

            tcResult.ExitCode = process.ExitCode;
            tcResult.Stdout = stdout;
            tcResult.Stderr = stderr;
            tcResult.ActualOutput = stdout;

            if (process.ExitCode != 0 || !string.IsNullOrWhiteSpace(stderr))
            {
                tcResult.Passed = false;
                tcResult.Error = !string.IsNullOrWhiteSpace(stderr) 
                    ? stderr.Trim() 
                    : $"Python process exited with error code {process.ExitCode}";
            }
            else if (!string.IsNullOrEmpty(testCase.ExpectedOutput))
            {
                var normalizedExpected = Platform.Application.Common.Utils.OutputNormalizer.Normalize(testCase.ExpectedOutput);
                var normalizedActual = Platform.Application.Common.Utils.OutputNormalizer.Normalize(stdout);
                tcResult.Passed = string.Equals(normalizedExpected, normalizedActual, StringComparison.Ordinal);
                if (!tcResult.Passed)
                {
                    tcResult.Error = Platform.Application.Common.Utils.OutputNormalizer.GetDiffMessage(testCase.ExpectedOutput, stdout);
                }
            }
            else
            {
                tcResult.Passed = true;
                tcResult.Error = string.Empty;
            }
        }
        catch (Exception ex)
        {
            tcResult.Passed = false;
            tcResult.Error = $"Runner Exception: {ex.Message}";
        }

        return tcResult;
    }
}
