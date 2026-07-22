using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Tasks.Dtos;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Application.Services;

public class TaskService : ITaskService
{
    private readonly IApplicationDbContext _context;

    public TaskService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ProgrammingTaskDto> CreateTaskAsync(Guid sessionId, CreateProgrammingTaskDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            throw new ArgumentException("Task Title is required.");
        }

        var session = await _context.Sessions.FindAsync(new object[] { sessionId }, cancellationToken);
        if (session == null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        if (!Enum.TryParse<ProgrammingTaskMode>(dto.Mode, true, out var taskMode))
        {
            taskMode = ProgrammingTaskMode.Homework; // default
        }

        if (!Enum.TryParse<ProgrammingTaskType>(dto.Type, true, out var taskType))
        {
            taskType = ProgrammingTaskType.ProgrammingChallenge; // default
        }

        if (!Enum.TryParse<GradingStrategy>(dto.GradingStrategy, true, out var gradingStrategy))
        {
            gradingStrategy = GradingStrategy.Educational; // default
        }

        if (!Enum.TryParse<EvaluationMode>(dto.EvaluationMode, true, out var evalMode))
        {
            evalMode = EvaluationMode.ManualReview; // default
        }

        if (string.IsNullOrWhiteSpace(dto.Description))
        {
            throw new ArgumentException("Task Description is required.");
        }

        if (dto.MaxGrade <= 0)
        {
            throw new ArgumentException("Max Grade must be greater than 0.");
        }

        var publicTestCases = string.IsNullOrWhiteSpace(dto.PublicTestCasesJson) ? "[]" : dto.PublicTestCasesJson;
        var hiddenTestCases = string.IsNullOrWhiteSpace(dto.HiddenTestCasesJson) ? "[]" : dto.HiddenTestCasesJson;
        var runHidden = dto.RunHiddenTestCases;

        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = sessionId,
            Title = dto.Title.Trim(),
            Description = dto.Description.Trim(),
            ExampleInput = taskType == ProgrammingTaskType.BasicExercise ? "" : dto.ExampleInput.Trim(),
            ExampleOutput = dto.ExampleOutput.Trim(),
            PublicTestCasesJson = publicTestCases.Trim(),
            HiddenTestCasesJson = hiddenTestCases.Trim(),
            Deadline = dto.Deadline,
            MaxGrade = dto.MaxGrade,
            Mode = taskMode,
            MaxAttempts = dto.MaxAttempts,
            RunHiddenTestCases = runHidden,
            Type = taskType,
            TimeLimitMs = dto.TimeLimitMs <= 0 ? 3000 : dto.TimeLimitMs,
            MemoryLimitMb = dto.MemoryLimitMb <= 0 ? 256 : dto.MemoryLimitMb,
            GradingStrategy = gradingStrategy,
            EvaluationMode = evalMode,
            Language = string.IsNullOrWhiteSpace(dto.Language) ? "python" : dto.Language.Trim().ToLowerInvariant(),
            IgnoreMultipleSpaces = dto.IgnoreMultipleSpaces,
            CreatedAt = DateTime.UtcNow
        };

        _context.ProgrammingTasks.Add(task);
        await _context.SaveChangesAsync(cancellationToken);

        return new ProgrammingTaskDto
        {
            Id = task.Id,
            SessionId = task.SessionId,
            Title = task.Title,
            Description = task.Description,
            ExampleInput = task.ExampleInput,
            ExampleOutput = task.ExampleOutput,
            PublicTestCasesJson = task.PublicTestCasesJson,
            Deadline = task.Deadline,
            MaxGrade = task.MaxGrade,
            Mode = task.Mode.ToString(),
            MaxAttempts = task.MaxAttempts,
            RunHiddenTestCases = task.RunHiddenTestCases,
            Type = task.Type.ToString(),
            TimeLimitMs = task.TimeLimitMs,
            MemoryLimitMb = task.MemoryLimitMb,
            GradingStrategy = task.GradingStrategy.ToString(),
            EvaluationMode = task.EvaluationMode.ToString(),
            Language = task.Language,
            IgnoreMultipleSpaces = task.IgnoreMultipleSpaces
        };
    }

    public async Task<ProgrammingTaskDto> GetTaskByIdAsync(Guid taskId, Guid userId, string role, CancellationToken cancellationToken = default)
    {
        var task = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null)
        {
            throw new InvalidOperationException("Programming task not found.");
        }

        var isTeacher = string.Equals(role, "Teacher", StringComparison.OrdinalIgnoreCase);

        if (!isTeacher && !task.Session.IsUnlocked)
        {
            throw new UnauthorizedAccessException("This session is locked.");
        }

        if (!isTeacher)
        {
            var alreadyViewed = await _context.UserTaskViews
                .AnyAsync(v => v.StudentId == userId && v.TaskId == taskId, cancellationToken);
            if (!alreadyViewed)
            {
                _context.UserTaskViews.Add(new UserTaskView
                {
                    Id = Guid.NewGuid(),
                    StudentId = userId,
                    TaskId = taskId,
                    ViewedAt = DateTime.UtcNow
                });
                await _context.SaveChangesAsync(cancellationToken);
            }
        }

        return new ProgrammingTaskDto
        {
            Id = task.Id,
            SessionId = task.SessionId,
            Title = task.Title,
            Description = task.Description,
            ExampleInput = task.ExampleInput,
            ExampleOutput = task.ExampleOutput,
            PublicTestCasesJson = task.PublicTestCasesJson,
            Deadline = task.Deadline,
            MaxGrade = task.MaxGrade,
            Mode = task.Mode.ToString(),
            MaxAttempts = task.MaxAttempts,
            RunHiddenTestCases = task.RunHiddenTestCases,
            Type = task.Type.ToString(),
            TimeLimitMs = task.TimeLimitMs,
            MemoryLimitMb = task.MemoryLimitMb,
            GradingStrategy = task.GradingStrategy.ToString(),
            EvaluationMode = task.EvaluationMode.ToString(),
            Language = task.Language,
            IgnoreMultipleSpaces = task.IgnoreMultipleSpaces
        };
    }

    public async Task DeleteTaskAsync(Guid taskId, Guid teacherId, CancellationToken cancellationToken = default)
    {
        var task = await _context.ProgrammingTasks
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null)
        {
            throw new InvalidOperationException("Task not found.");
        }

        _context.ProgrammingTasks.Remove(task);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private static List<TestCaseModel> DeserializeTestCases(string json)
    {
        if (string.IsNullOrWhiteSpace(json)) return new List<TestCaseModel>();
        try
        {
            var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return System.Text.Json.JsonSerializer.Deserialize<List<TestCaseModel>>(json, options) ?? new List<TestCaseModel>();
        }
        catch
        {
            return new List<TestCaseModel>();
        }
    }
}
