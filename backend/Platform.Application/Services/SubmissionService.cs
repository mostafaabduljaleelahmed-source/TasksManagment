using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Platform.Application.Common.Interfaces;
using Platform.Application.Common.Utils;
using Platform.Application.Features.Submissions.Dtos;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Application.Services;

public class SubmissionService : ISubmissionService
{
    private readonly IApplicationDbContext _context;
    private readonly IExecutionService _executionService;
    private readonly ILanguageRegistry _languageRegistry;
    private readonly IGradingEngineDispatcher _gradingEngineDispatcher;
    private readonly ILogger<SubmissionService> _logger;
    private readonly IActivityLogger _activityLogger;
    private readonly IEmailService _emailService;

    public SubmissionService(
        IApplicationDbContext context,
        IExecutionService executionService,
        ILanguageRegistry languageRegistry,
        IGradingEngineDispatcher gradingEngineDispatcher,
        ILogger<SubmissionService> logger,
        IActivityLogger activityLogger,
        IEmailService emailService)
    {
        _context = context;
        _executionService = executionService;
        _languageRegistry = languageRegistry;
        _gradingEngineDispatcher = gradingEngineDispatcher;
        _logger = logger;
        _activityLogger = activityLogger;
        _emailService = emailService;
    }

    public async Task<RunResultDto> RunCodeAsync(Guid taskId, RunCodeDto dto, CancellationToken cancellationToken = default)
    {
        var task = await _context.ProgrammingTasks.FindAsync(new object[] { taskId }, cancellationToken);
        if (task == null)
        {
            throw new InvalidOperationException("Programming task not found.");
        }

        _logger.LogInformation("RunCodeAsync Judge0 sandbox execution called for Task ID: {TaskId}, Language: {Language}.", task.Id, task.Language);

        var langDef = _languageRegistry.GetLanguage(task.Language);
        var languageId = langDef != null ? langDef.Judge0LanguageId : 71;

        var sandboxInput = !string.IsNullOrEmpty(dto.Input) ? dto.Input : (task.ExampleInput ?? string.Empty);
        var request = new Judge0ExecutionRequest
        {
            SourceCode = dto.Code,
            LanguageId = languageId,
            Stdin = sandboxInput,
            ExpectedOutput = string.Empty,
            CpuTimeLimitSeconds = task.TimeLimitMs > 0 ? task.TimeLimitMs / 1000.0 : 3.0,
            MemoryLimitKb = task.MemoryLimitMb > 0 ? task.MemoryLimitMb * 1024 : 256000
        };

        var judge0Result = await _executionService.ExecuteAsync(request, cancellationToken);

        if (judge0Result.IsServiceUnavailable)
        {
            throw new InvalidOperationException($"Execution engine service is currently unavailable: {judge0Result.Stderr}");
        }

        int executionTimeMs = (int)(judge0Result.TimeSeconds * 1000.0);
        bool passed = judge0Result.StatusId == 3 || (judge0Result.StatusId != 6 && string.IsNullOrEmpty(judge0Result.Stderr) && string.IsNullOrEmpty(judge0Result.CompileOutput));

        string generalError = !string.IsNullOrEmpty(judge0Result.CompileOutput)
            ? judge0Result.CompileOutput
            : (!string.IsNullOrEmpty(judge0Result.Stderr) ? judge0Result.Stderr : (judge0Result.StatusId != 3 ? judge0Result.StatusDescription : string.Empty));

        return new RunResultDto
        {
            Passed = passed,
            PassedCount = passed ? 1 : 0,
            TotalCount = 1,
            Feedback = judge0Result.StatusDescription,
            Stdout = judge0Result.Stdout ?? string.Empty,
            Stderr = generalError,
            Error = generalError,
            ExecutionTimeMs = executionTimeMs,
            Details = new List<RunResultDetailsDto>
            {
                new RunResultDetailsDto
                {
                    Input = sandboxInput,
                    ExpectedOutput = string.Empty,
                    ActualOutput = judge0Result.Stdout ?? string.Empty,
                    Passed = passed,
                    Error = generalError
                }
            }
        };
    }

    public async Task<SubmissionDto> SubmitCodeAsync(Guid studentId, Guid taskId, SubmitCodeDto dto, CancellationToken cancellationToken = default)
    {
        var task = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null)
        {
            throw new InvalidOperationException("Invalid Task ID.");
        }

        var studentExists = await _context.Users.AnyAsync(u => u.Id == studentId, cancellationToken);
        if (!studentExists)
        {
            throw new InvalidOperationException("Invalid User ID.");
        }

        _logger.LogInformation("SubmitCodeAsync called for Student: {StudentId}, Task ID: {TaskId}.", studentId, task.Id);

        if (!task.Session.IsUnlocked)
        {
            throw new InvalidOperationException("Cannot submit to a locked session task.");
        }

        var attemptsCount = await _context.Submissions
            .CountAsync(s => s.StudentId == studentId && s.TaskId == taskId, cancellationToken);

        if (task.Mode == ProgrammingTaskMode.Homework)
        {
            if (DateTime.UtcNow > task.Deadline)
            {
                throw new InvalidOperationException("The deadline for this homework has passed.");
            }

            if (attemptsCount >= task.MaxAttempts)
            {
                throw new InvalidOperationException("You have reached the maximum allowed attempts for this homework.");
            }
        }

        if (string.IsNullOrWhiteSpace(dto.Code))
        {
            throw new InvalidOperationException("Submission code cannot be empty. Please write or upload valid code before submitting.");
        }

        var gradingContext = new GradingContext
        {
            Task = task,
            StudentId = studentId,
            Code = dto.Code,
            AttemptNumber = attemptsCount + 1
        };

        var gradingResult = await _gradingEngineDispatcher.DispatchAsync(gradingContext, cancellationToken);

        if (gradingResult.IsServiceUnavailable)
        {
            throw new InvalidOperationException("Automatic grading service is unavailable.");
        }

        var submission = new Submission
        {
            Id = Guid.NewGuid(),
            TaskId = taskId,
            StudentId = studentId,
            Code = dto.Code,
            Grade = gradingResult.Grade,
            Feedback = gradingResult.Feedback,
            TeacherFeedback = string.Empty,
            PassedPublicCases = gradingResult.PassedPublicCases,
            TotalPublicCases = gradingResult.TotalPublicCases,
            PassedHiddenCases = gradingResult.PassedHiddenCases,
            TotalHiddenCases = gradingResult.TotalHiddenCases,
            ExecutionTimeMs = gradingResult.ExecutionTimeMs,
            ExecutionStatus = gradingResult.ExecutionStatus,
            TestCaseResultsJson = gradingResult.TestCaseResultsJson,
            AttemptNumber = attemptsCount + 1,
            SubmittedAt = DateTime.UtcNow,
            SimilarityScore = null,
            ComparisonReport = null,
            ConsoleOutput = gradingResult.ConsoleOutput,
            ExpectedOutput = gradingResult.ExpectedOutput,
            TeacherNotes = string.Empty,
            Status = SubmissionStatus.Pending,
            IsReviewed = false,
            ReviewedAt = null
        };

        _context.Submissions.Add(submission);

        // Trigger Notifications
        var course = await _context.Courses
            .Include(c => c.CourseTeachers)
            .FirstOrDefaultAsync(c => c.Id == task.Session.CourseId, cancellationToken);
        var student = await _context.Users.FindAsync(new object[] { studentId }, cancellationToken);
        if (course != null && student != null)
        {
            var teacherIds = course.CourseTeachers.Select(ct => ct.TeacherId).ToList();
            if (!teacherIds.Contains(course.TeacherId))
            {
                teacherIds.Add(course.TeacherId);
            }

            bool isLate = task.Mode == ProgrammingTaskMode.Homework && DateTime.UtcNow > task.Deadline;

            foreach (var teacherId in teacherIds)
            {
                var msg = isLate
                    ? $"{student.Name} submitted task '{task.Title}' LATE (Attempt #{submission.AttemptNumber})."
                    : $"{student.Name} submitted task '{task.Title}' (Attempt #{submission.AttemptNumber}).";

                _context.Notifications.Add(new Notification
                {
                    Id = Guid.NewGuid(),
                    UserId = teacherId,
                    Message = msg,
                    TaskId = task.Id,
                    StudentId = student.Id,
                    SubmissionId = submission.Id,
                    CreatedAt = DateTime.UtcNow,
                    IsRead = false
                });

                if (task.Mode == ProgrammingTaskMode.Homework && (attemptsCount + 1) >= task.MaxAttempts)
                {
                    _context.Notifications.Add(new Notification
                    {
                        Id = Guid.NewGuid(),
                        UserId = teacherId,
                        Message = $"{student.Name} reached maximum attempts ({task.MaxAttempts}) for task '{task.Title}'.",
                        TaskId = task.Id,
                        StudentId = student.Id,
                        SubmissionId = submission.Id,
                        CreatedAt = DateTime.UtcNow,
                        IsRead = false
                    });
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _activityLogger.LogAsync(
            studentId,
            "Assignment Submission",
            $"Submitted attempt #{submission.AttemptNumber} for assignment '{task.Title}'",
            course?.Id,
            course?.Name,
            task.Id,
            task.Title,
            cancellationToken);

        return new SubmissionDto
        {
            Id = submission.Id,
            TaskId = submission.TaskId,
            TaskTitle = task.Title,
            StudentId = submission.StudentId,
            StudentName = student?.Name ?? "Student",
            Code = submission.Code,
            Grade = submission.Grade,
            Feedback = submission.Feedback,
            TeacherFeedback = submission.TeacherFeedback,
            PassedPublicCases = submission.PassedPublicCases,
            TotalPublicCases = submission.TotalPublicCases,
            PassedHiddenCases = submission.PassedHiddenCases,
            TotalHiddenCases = submission.TotalHiddenCases,
            ExecutionTimeMs = submission.ExecutionTimeMs,
            ExecutionStatus = submission.ExecutionStatus,
            TestCaseResultsJson = submission.TestCaseResultsJson,
            AttemptNumber = submission.AttemptNumber,
            SubmittedAt = submission.SubmittedAt,
            SimilarityScore = submission.SimilarityScore,
            ComparisonReport = submission.ComparisonReport,
            ConsoleOutput = submission.ConsoleOutput,
            ExpectedOutput = submission.ExpectedOutput,
            TeacherNotes = submission.TeacherNotes
        };
    }

    public async Task<List<SubmissionDto>> GetStudentTaskSubmissionsAsync(Guid studentId, Guid taskId, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .Include(s => s.Task)
            .Include(s => s.Student)
            .Where(s => s.StudentId == studentId && s.TaskId == taskId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new SubmissionDto
            {
                Id = s.Id,
                TaskId = s.TaskId,
                TaskTitle = s.Task.Title,
                StudentId = s.StudentId,
                StudentName = s.Student.Name,
                Code = s.Code,
                Grade = s.Grade,
                Feedback = s.Feedback,
                TeacherFeedback = s.TeacherFeedback,
                PassedPublicCases = s.PassedPublicCases,
                TotalPublicCases = s.TotalPublicCases,
                PassedHiddenCases = s.PassedHiddenCases,
                TotalHiddenCases = s.TotalHiddenCases,
                ExecutionTimeMs = s.ExecutionTimeMs,
                ExecutionStatus = s.ExecutionStatus,
                TestCaseResultsJson = s.TestCaseResultsJson,
                AttemptNumber = s.AttemptNumber,
                SubmittedAt = s.SubmittedAt,
                SimilarityScore = s.SimilarityScore,
                ComparisonReport = s.ComparisonReport,
                ConsoleOutput = s.ConsoleOutput,
                ExpectedOutput = s.ExpectedOutput,
                TeacherNotes = s.TeacherNotes
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<SubmissionDto>> GetTaskSubmissionsAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        return await _context.Submissions
            .Include(s => s.Task)
            .Include(s => s.Student)
            .Where(s => s.TaskId == taskId)
            .OrderByDescending(s => s.SubmittedAt)
            .Select(s => new SubmissionDto
            {
                Id = s.Id,
                TaskId = s.TaskId,
                TaskTitle = s.Task.Title,
                StudentId = s.StudentId,
                StudentName = s.Student.Name,
                Code = s.Code,
                Grade = s.Grade,
                Feedback = s.Feedback,
                TeacherFeedback = s.TeacherFeedback,
                PassedPublicCases = s.PassedPublicCases,
                TotalPublicCases = s.TotalPublicCases,
                PassedHiddenCases = s.PassedHiddenCases,
                TotalHiddenCases = s.TotalHiddenCases,
                ExecutionTimeMs = s.ExecutionTimeMs,
                ExecutionStatus = s.ExecutionStatus,
                TestCaseResultsJson = s.TestCaseResultsJson,
                AttemptNumber = s.AttemptNumber,
                SubmittedAt = s.SubmittedAt,
                SimilarityScore = s.SimilarityScore,
                ComparisonReport = s.ComparisonReport,
                ConsoleOutput = s.ConsoleOutput,
                ExpectedOutput = s.ExpectedOutput,
                TeacherNotes = s.TeacherNotes,
                Status = s.Status.ToString(),
                IsReviewed = s.IsReviewed,
                ReviewedAt = s.ReviewedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<object> GetTaskSubmissionsStatsAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var task = await _context.ProgrammingTasks.FindAsync(new object[] { taskId }, cancellationToken);
        if (task == null)
        {
            throw new InvalidOperationException("Task not found.");
        }

        var submissions = await _context.Submissions
            .Where(s => s.TaskId == taskId)
            .ToListAsync(cancellationToken);

        var totalSubmissions = submissions.Count;
        var uniqueStudents = submissions.Select(s => s.StudentId).Distinct().Count();

        var grades = submissions.Select(s => s.Grade).ToList();
        var avgGrade = grades.Count > 0 ? grades.Average() : 0;
        var maxGrade = grades.Count > 0 ? grades.Max() : 0;
        var minGrade = grades.Count > 0 ? grades.Min() : 0;

        var attemptsPerStudent = submissions
            .GroupBy(s => s.StudentId)
            .Select(g => new { StudentId = g.Key, Attempts = g.Count() })
            .ToList();

        return new
        {
            TotalSubmissions = totalSubmissions,
            UniqueStudentsSubmitted = uniqueStudents,
            AverageGrade = Math.Round(avgGrade, 1),
            HighestGrade = maxGrade,
            LowestGrade = minGrade,
            AttemptsPerStudent = attemptsPerStudent
        };
    }

    public async Task<object> GetStudentTaskStatsAsync(Guid studentId, Guid taskId, CancellationToken cancellationToken = default)
    {
        var task = await _context.ProgrammingTasks.FindAsync(new object[] { taskId }, cancellationToken);
        if (task == null)
        {
            throw new InvalidOperationException("Task not found.");
        }

        var submissions = await _context.Submissions
            .Where(s => s.StudentId == studentId && s.TaskId == taskId)
            .ToListAsync(cancellationToken);

        var attemptsCount = submissions.Count;
        var bestScore = submissions.Count > 0 ? submissions.Max(s => s.Grade) : 0;
        var remainingAttempts = Math.Max(0, task.MaxAttempts - attemptsCount);

        return new
        {
            BestScore = bestScore,
            AttemptsCount = attemptsCount,
            RemainingAttempts = task.Mode == ProgrammingTaskMode.InClass ? -1 : remainingAttempts, // -1 means infinite/InClass mode
            MaxAttempts = task.Mode == ProgrammingTaskMode.InClass ? -1 : task.MaxAttempts,
            Deadline = task.Deadline
        };
    }

    public async Task<SubmissionDto> ReviewSubmissionAsync(Guid submissionId, ReviewSubmissionDto dto, CancellationToken cancellationToken = default)
    {
        var submission = await _context.Submissions
            .Include(s => s.Task)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

        if (submission == null)
        {
            throw new InvalidOperationException("Submission not found.");
        }

        // Enforce Latest Attempt Only Rule
        var isLatest = !await _context.Submissions
            .AnyAsync(s => s.StudentId == submission.StudentId && s.TaskId == submission.TaskId && s.SubmittedAt > submission.SubmittedAt, cancellationToken);

        if (!isLatest)
        {
            throw new InvalidOperationException("Only the latest submission attempt for a student can be reviewed or graded. Older attempts are read-only history.");
        }

        submission.Grade = dto.Grade;
        submission.TeacherFeedback = dto.TeacherFeedback;
        submission.TeacherNotes = dto.TeacherNotes;
        submission.Status = SubmissionStatus.Graded;
        submission.IsReviewed = true;
        submission.ReviewedAt = DateTime.UtcNow;

        // Send notification to student
        _context.Notifications.Add(new Notification
        {
            Id = Guid.NewGuid(),
            UserId = submission.StudentId,
            Message = $"Your submission for '{submission.Task.Title}' has been graded. Grade: {submission.Grade}/{submission.Task.MaxGrade}.",
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        });

        await _context.SaveChangesAsync(cancellationToken);

        // Fetch task session course
        var course = await _context.Courses
            .Include(c => c.Sessions)
            .FirstOrDefaultAsync(c => c.Sessions.Any(sess => sess.Id == submission.Task.SessionId), cancellationToken);

        await _activityLogger.LogAsync(
            course?.TeacherId ?? Guid.Empty,
            "Grade Updated",
            $"Grade updated to {submission.Grade}/{submission.Task.MaxGrade} for student {submission.Student.Name}",
            course?.Id,
            course?.Name,
            submission.TaskId,
            submission.Task.Title,
            cancellationToken);

        // Send Grade Released Email Notification
        await _emailService.SendGradeReleasedNotificationAsync(
            submission.Student,
            submission.Task.Title,
            submission.Grade,
            submission.Task.MaxGrade,
            cancellationToken);

        if (!string.IsNullOrWhiteSpace(dto.TeacherFeedback))
        {
            await _activityLogger.LogAsync(
                course?.TeacherId ?? Guid.Empty,
                "Feedback Provided",
                $"Teacher left feedback on '{submission.Task.Title}' for {submission.Student.Name}",
                course?.Id,
                course?.Name,
                submission.TaskId,
                submission.Task.Title,
                cancellationToken);

            // Send Teacher Feedback Email Notification
            await _emailService.SendTeacherFeedbackNotificationAsync(
                submission.Student,
                submission.Task.Title,
                dto.TeacherFeedback,
                cancellationToken);
        }

        return new SubmissionDto
        {
            Id = submission.Id,
            TaskId = submission.TaskId,
            TaskTitle = submission.Task.Title,
            StudentId = submission.StudentId,
            StudentName = submission.Student.Name,
            Code = submission.Code,
            Grade = submission.Grade,
            Feedback = submission.Feedback,
            TeacherFeedback = submission.TeacherFeedback,
            PassedPublicCases = submission.PassedPublicCases,
            TotalPublicCases = submission.TotalPublicCases,
            PassedHiddenCases = submission.PassedHiddenCases,
            TotalHiddenCases = submission.TotalHiddenCases,
            ExecutionTimeMs = submission.ExecutionTimeMs,
            AttemptNumber = submission.AttemptNumber,
            SubmittedAt = submission.SubmittedAt,
            SimilarityScore = submission.SimilarityScore,
            ComparisonReport = submission.ComparisonReport,
            ConsoleOutput = submission.ConsoleOutput,
            ExpectedOutput = submission.ExpectedOutput,
            TeacherNotes = submission.TeacherNotes
        };
    }

    public async Task<SubmissionDto> EditSubmissionReviewAsync(Guid submissionId, ReviewSubmissionDto dto, CancellationToken cancellationToken = default)
    {
        return await ReviewSubmissionAsync(submissionId, dto, cancellationToken);
    }

    public async Task<SubmissionDto> ResetSubmissionReviewAsync(Guid submissionId, CancellationToken cancellationToken = default)
    {
        var submission = await _context.Submissions
            .Include(s => s.Task)
            .Include(s => s.Student)
            .FirstOrDefaultAsync(s => s.Id == submissionId, cancellationToken);

        if (submission == null)
        {
            throw new InvalidOperationException("Submission not found.");
        }

        var isLatest = !await _context.Submissions
            .AnyAsync(s => s.StudentId == submission.StudentId && s.TaskId == submission.TaskId && s.SubmittedAt > submission.SubmittedAt, cancellationToken);

        if (!isLatest)
        {
            throw new InvalidOperationException("Only the latest submission attempt can be reset. Older attempts are read-only history.");
        }

        submission.Status = SubmissionStatus.Pending;
        submission.IsReviewed = false;
        submission.ReviewedAt = null;
        submission.Grade = 0;
        submission.TeacherFeedback = string.Empty;
        submission.TeacherNotes = string.Empty;

        await _context.SaveChangesAsync(cancellationToken);

        return new SubmissionDto
        {
            Id = submission.Id,
            TaskId = submission.TaskId,
            TaskTitle = submission.Task.Title,
            StudentId = submission.StudentId,
            StudentName = submission.Student.Name,
            Code = submission.Code,
            Grade = submission.Grade,
            Feedback = submission.Feedback,
            TeacherFeedback = submission.TeacherFeedback,
            PassedPublicCases = submission.PassedPublicCases,
            TotalPublicCases = submission.TotalPublicCases,
            PassedHiddenCases = submission.PassedHiddenCases,
            TotalHiddenCases = submission.TotalHiddenCases,
            ExecutionTimeMs = submission.ExecutionTimeMs,
            AttemptNumber = submission.AttemptNumber,
            SubmittedAt = submission.SubmittedAt,
            SimilarityScore = submission.SimilarityScore,
            ComparisonReport = submission.ComparisonReport,
            ConsoleOutput = submission.ConsoleOutput,
            ExpectedOutput = submission.ExpectedOutput,
            TeacherNotes = submission.TeacherNotes
        };
    }

    public async Task<int> ResetAllSubmissionsAsync(CancellationToken cancellationToken = default)
    {
        var submissions = await _context.Submissions.ToListAsync(cancellationToken);
        if (!submissions.Any()) return 0;

        int resetCount = 0;
        var groups = submissions.GroupBy(s => new { s.StudentId, s.TaskId });

        foreach (var g in groups)
        {
            var sorted = g.OrderBy(s => s.SubmittedAt).ThenBy(s => s.AttemptNumber).ToList();
            for (int i = 0; i < sorted.Count; i++)
            {
                var sub = sorted[i];
                sub.AttemptNumber = i + 1;
                bool isLatest = (i == sorted.Count - 1);

                if (isLatest)
                {
                    // Latest attempt becomes Pending so teacher can review it
                    sub.Status = SubmissionStatus.Pending;
                    sub.IsReviewed = false;
                    sub.ReviewedAt = null;
                    sub.Grade = 0;
                    sub.TeacherFeedback = string.Empty;
                    sub.TeacherNotes = string.Empty;
                    resetCount++;
                }
                else
                {
                    // Older attempt stays Graded (0 grade) as read-only history
                    sub.Status = SubmissionStatus.Graded;
                    sub.IsReviewed = true;
                    sub.Grade = 0;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return resetCount;
    }

    public async Task<int> ResetStudentSubmissionsAsync(Guid studentId, CancellationToken cancellationToken = default)
    {
        var submissions = await _context.Submissions.Where(s => s.StudentId == studentId).ToListAsync(cancellationToken);
        return await ResetSubmissionGroupListAsync(submissions, cancellationToken);
    }

    public async Task<int> ResetTaskSubmissionsAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var submissions = await _context.Submissions.Where(s => s.TaskId == taskId).ToListAsync(cancellationToken);
        return await ResetSubmissionGroupListAsync(submissions, cancellationToken);
    }

    public async Task<int> ResetCourseSubmissionsAsync(Guid courseId, CancellationToken cancellationToken = default)
    {
        var taskIds = await _context.Sessions
            .Where(s => s.CourseId == courseId)
            .SelectMany(s => s.Tasks)
            .Select(t => t.Id)
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions.Where(s => taskIds.Contains(s.TaskId)).ToListAsync(cancellationToken);
        return await ResetSubmissionGroupListAsync(submissions, cancellationToken);
    }

    public async Task<int> ResetPlatformSubmissionsAsync(CancellationToken cancellationToken = default)
    {
        return await ResetAllSubmissionsAsync(cancellationToken);
    }

    private async Task<int> ResetSubmissionGroupListAsync(List<Submission> submissions, CancellationToken cancellationToken)
    {
        if (!submissions.Any()) return 0;
        int resetCount = 0;
        var groups = submissions.GroupBy(s => new { s.StudentId, s.TaskId });

        foreach (var g in groups)
        {
            var sorted = g.OrderBy(s => s.SubmittedAt).ThenBy(s => s.AttemptNumber).ToList();
            for (int i = 0; i < sorted.Count; i++)
            {
                var sub = sorted[i];
                sub.AttemptNumber = i + 1;
                bool isLatest = (i == sorted.Count - 1);

                if (isLatest)
                {
                    sub.Status = SubmissionStatus.Pending;
                    sub.IsReviewed = false;
                    sub.ReviewedAt = null;
                    sub.Grade = 0;
                    sub.TeacherFeedback = string.Empty;
                    sub.TeacherNotes = string.Empty;
                    resetCount++;
                }
                else
                {
                    sub.Status = SubmissionStatus.Graded;
                    sub.IsReviewed = true;
                    sub.Grade = 0;
                }
            }
        }

        await _context.SaveChangesAsync(cancellationToken);
        return resetCount;
    }

    private static SubmissionDto MapSubmissionToDto(Submission submission, string taskTitle, string studentName)
    {
        return new SubmissionDto
        {
            Id = submission.Id,
            TaskId = submission.TaskId,
            TaskTitle = taskTitle,
            StudentId = submission.StudentId,
            StudentName = studentName,
            Code = submission.Code,
            Grade = submission.Grade,
            Feedback = submission.Feedback,
            TeacherFeedback = submission.TeacherFeedback,
            PassedPublicCases = submission.PassedPublicCases,
            TotalPublicCases = submission.TotalPublicCases,
            PassedHiddenCases = submission.PassedHiddenCases,
            TotalHiddenCases = submission.TotalHiddenCases,
            ExecutionTimeMs = submission.ExecutionTimeMs,
            AttemptNumber = submission.AttemptNumber,
            SubmittedAt = submission.SubmittedAt,
            SimilarityScore = submission.SimilarityScore,
            ComparisonReport = submission.ComparisonReport,
            ConsoleOutput = submission.ConsoleOutput,
            ExpectedOutput = submission.ExpectedOutput,
            TeacherNotes = submission.TeacherNotes
        };
    }

    private double CalculateJaccardSimilarity(string code1, string code2)
    {
        if (string.IsNullOrWhiteSpace(code1) || string.IsNullOrWhiteSpace(code2)) return 0;
        var separators = new[] { ' ', '\r', '\n', '\t' };
        var set1 = new HashSet<string>(code1.Split(separators, StringSplitOptions.RemoveEmptyEntries));
        var set2 = new HashSet<string>(code2.Split(separators, StringSplitOptions.RemoveEmptyEntries));
        if (set1.Count == 0 && set2.Count == 0) return 100.0;
        double intersection = set1.Intersect(set2).Count();
        double union = set1.Union(set2).Count();
        return union > 0 ? (intersection / union) * 100.0 : 0.0;
    }

    private List<TestCaseModel> DeserializeTestCases(string json)
    {
        try
        {
            var options = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            return JsonSerializer.Deserialize<List<TestCaseModel>>(json, options) ?? new List<TestCaseModel>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deserializing test cases: {Json}", json);
            return new List<TestCaseModel>();
        }
    }
}
