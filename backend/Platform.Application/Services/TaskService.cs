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
    private readonly IActivityLogger _logger;
    private readonly IEmailService _emailService;

    public TaskService(IApplicationDbContext context, IActivityLogger logger, IEmailService emailService)
    {
        _context = context;
        _logger = logger;
        _emailService = emailService;
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

        var course = await _context.Courses.FirstOrDefaultAsync(c => c.Sessions.Any(s => s.Id == sessionId), cancellationToken);
        if (course != null)
        {
            await _logger.LogAsync(
                course.TeacherId,
                "Assignment Created",
                $"Created assignment '{task.Title}' in session '{session.Title}'",
                course.Id,
                course.Name,
                task.Id,
                task.Title,
                cancellationToken);

            // Send New Assignment Email Notification to Enrolled Students
            var enrolledStudents = await _context.Enrollments
                .Include(e => e.Student)
                .Where(e => e.CourseId == course.Id)
                .Select(e => e.Student)
                .ToListAsync(cancellationToken);

            foreach (var student in enrolledStudents)
            {
                await _emailService.SendNewAssignmentNotificationAsync(student, task.Title, course.Name, task.Deadline, cancellationToken);
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
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId, cancellationToken);
        var task = await _context.ProgrammingTasks
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null)
        {
            throw new InvalidOperationException("Task not found.");
        }

        if (user == null || (user.Role != Domain.Enums.UserRole.Admin && user.Role != Domain.Enums.UserRole.Teacher))
        {
            throw new UnauthorizedAccessException("You do not have permission to delete tasks.");
        }

        // 1. Delete associated Submissions
        var submissions = await _context.Submissions.Where(s => s.TaskId == taskId).ToListAsync(cancellationToken);
        if (submissions.Any())
        {
            _context.Submissions.RemoveRange(submissions);
        }

        // 2. Delete associated UserTaskViews
        var views = await _context.UserTaskViews.Where(v => v.TaskId == taskId).ToListAsync(cancellationToken);
        if (views.Any())
        {
            _context.UserTaskViews.RemoveRange(views);
        }

        // 3. Delete associated Notifications referencing this task
        var notifications = await _context.Notifications.Where(n => n.TaskId == taskId).ToListAsync(cancellationToken);
        if (notifications.Any())
        {
            _context.Notifications.RemoveRange(notifications);
        }

        // 4. Nullify ActivityLogs referencing this task
        var activityLogs = await _context.ActivityLogs.Where(a => a.TaskId == taskId).ToListAsync(cancellationToken);
        if (activityLogs.Any())
        {
            foreach (var log in activityLogs)
            {
                log.TaskId = null;
            }
        }

        // 5. Remove task entity
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
