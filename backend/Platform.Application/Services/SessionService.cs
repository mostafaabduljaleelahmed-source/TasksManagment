using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Sessions.Dtos;
using Platform.Application.Features.Tasks.Dtos;
using Platform.Domain.Entities;

namespace Platform.Application.Services;

public class SessionService : ISessionService
{
    private readonly IApplicationDbContext _context;

    public SessionService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SessionDto> CreateSessionAsync(Guid courseId, CreateSessionDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            throw new ArgumentException("Session Title is required.");
        }

        var courseExists = await _context.Courses.AnyAsync(c => c.Id == courseId, cancellationToken);
        if (!courseExists)
        {
            throw new InvalidOperationException("Course not found.");
        }

        var session = new Session
        {
            Id = Guid.NewGuid(),
            CourseId = courseId,
            Title = dto.Title.Trim(),
            Order = dto.Order,
            IsUnlocked = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Sessions.Add(session);
        await _context.SaveChangesAsync(cancellationToken);

        return new SessionDto
        {
            Id = session.Id,
            CourseId = session.CourseId,
            Title = session.Title,
            Order = session.Order,
            IsUnlocked = session.IsUnlocked,
            Tasks = new List<ProgrammingTaskDto>()
        };
    }

    public async Task<List<SessionDto>> GetCourseSessionsAsync(Guid courseId, Guid userId, string role, CancellationToken cancellationToken = default)
    {
        var isTeacher = string.Equals(role, "Teacher", StringComparison.OrdinalIgnoreCase);

        var sessions = await _context.Sessions
            .Include(s => s.Tasks)
            .Where(s => s.CourseId == courseId && !s.IsArchived)
            .OrderBy(s => s.Order)
            .ToListAsync(cancellationToken);

        var userSubmissions = await _context.Submissions
            .Where(s => s.StudentId == userId)
            .ToListAsync(cancellationToken);

        int totalEnrolled = 0;
        List<Submission> allTaskSubmissions = new List<Submission>();

        if (isTeacher)
        {
            totalEnrolled = await _context.Enrollments.CountAsync(e => e.CourseId == courseId, cancellationToken);
            var courseTaskIds = sessions.SelectMany(s => s.Tasks.Where(t => !t.IsArchived)).Select(t => t.Id).ToList();
            allTaskSubmissions = await _context.Submissions
                .Where(s => courseTaskIds.Contains(s.TaskId))
                .ToListAsync(cancellationToken);
        }

        var result = new List<SessionDto>();
        foreach (var s in sessions)
        {
            var dto = new SessionDto
            {
                Id = s.Id,
                CourseId = s.CourseId,
                Title = s.Title,
                Order = s.Order,
                IsUnlocked = s.IsUnlocked
            };

            if (isTeacher || s.IsUnlocked)
            {
                dto.Tasks = s.Tasks.Where(t => !t.IsArchived).Select(t =>
                {
                    var taskSubs = userSubmissions.Where(sub => sub.TaskId == t.Id).ToList();
                    var latestSub = taskSubs.OrderByDescending(sub => sub.SubmittedAt).FirstOrDefault();
                    int attemptsCount = taskSubs.Count;
                    int remainingAttempts = Math.Max(0, t.MaxAttempts - attemptsCount);

                    string taskStatus = "Not Submitted";
                    int? myGrade = null;
                    DateTime? submittedAt = null;

                    if (latestSub != null)
                    {
                        submittedAt = latestSub.SubmittedAt;
                        bool isGraded = latestSub.Grade > 0 || !string.IsNullOrWhiteSpace(latestSub.TeacherFeedback);

                        if (isGraded)
                        {
                            taskStatus = "Graded";
                            myGrade = taskSubs.Max(sub => sub.Grade);
                        }
                        else if (latestSub.SubmittedAt > t.Deadline)
                        {
                            taskStatus = "Late Submission";
                        }
                        else
                        {
                            taskStatus = "Submitted - Pending Review";
                        }
                    }
                    else if (DateTime.UtcNow > t.Deadline)
                    {
                        taskStatus = "Deadline Passed";
                    }

                    int submittedCount = 0;
                    int missingCount = 0;
                    int pendingReviewsCount = 0;

                    if (isTeacher)
                    {
                        var subsForTask = allTaskSubmissions.Where(sub => sub.TaskId == t.Id).ToList();
                        var studentSubMap = subsForTask.GroupBy(sub => sub.StudentId);
                        submittedCount = studentSubMap.Count();
                        missingCount = Math.Max(0, totalEnrolled - submittedCount);
                        pendingReviewsCount = studentSubMap.Count(g =>
                        {
                            var latest = g.OrderByDescending(sub => sub.SubmittedAt).First();
                            return latest.Grade == 0 && string.IsNullOrWhiteSpace(latest.TeacherFeedback);
                        });
                    }

                    return new ProgrammingTaskDto
                    {
                        Id = t.Id,
                        SessionId = t.SessionId,
                        Title = t.Title,
                        Description = t.Description,
                        ExampleInput = t.ExampleInput,
                        ExampleOutput = t.ExampleOutput,
                        PublicTestCasesJson = t.PublicTestCasesJson,
                        Deadline = t.Deadline,
                        MaxGrade = t.MaxGrade,
                        Mode = t.Mode.ToString(),
                        MaxAttempts = t.MaxAttempts,
                        RunHiddenTestCases = t.RunHiddenTestCases,
                        Type = t.Type.ToString(),
                        TimeLimitMs = t.TimeLimitMs,
                        MemoryLimitMb = t.MemoryLimitMb,
                        GradingStrategy = t.GradingStrategy.ToString(),
                        IgnoreMultipleSpaces = t.IgnoreMultipleSpaces,
                        AttachmentsJson = t.AttachmentsJson,
                        Status = taskStatus,
                        Grade = myGrade,
                        SubmittedAt = submittedAt,
                        AttemptsUsed = attemptsCount,
                        RemainingAttempts = remainingAttempts,
                        SubmittedCount = submittedCount,
                        MissingCount = missingCount,
                        PendingReviewsCount = pendingReviewsCount
                    };
                }).ToList();
            }
            else
            {
                dto.Tasks = new List<ProgrammingTaskDto>();
            }

            result.Add(dto);
        }

        return result;
    }

    public async Task<SessionDto> UnlockSessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _context.Sessions
            .Include(s => s.Tasks)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        session.IsUnlocked = true;
        await _context.SaveChangesAsync(cancellationToken);

        return new SessionDto
        {
            Id = session.Id,
            CourseId = session.CourseId,
            Title = session.Title,
            Order = session.Order,
            IsUnlocked = session.IsUnlocked,
            Tasks = session.Tasks.Select(t => new ProgrammingTaskDto
            {
                Id = t.Id,
                SessionId = t.SessionId,
                Title = t.Title,
                Description = t.Description,
                ExampleInput = t.ExampleInput,
                ExampleOutput = t.ExampleOutput,
                PublicTestCasesJson = t.PublicTestCasesJson,
                Deadline = t.Deadline,
                MaxGrade = t.MaxGrade,
                Mode = t.Mode.ToString(),
                MaxAttempts = t.MaxAttempts,
                RunHiddenTestCases = t.RunHiddenTestCases,
                Type = t.Type.ToString(),
                TimeLimitMs = t.TimeLimitMs,
                MemoryLimitMb = t.MemoryLimitMb,
                GradingStrategy = t.GradingStrategy.ToString(),
                IgnoreMultipleSpaces = t.IgnoreMultipleSpaces
            }).ToList()
        };
    }

    public async Task<SessionDto> LockSessionAsync(Guid sessionId, CancellationToken cancellationToken = default)
    {
        var session = await _context.Sessions
            .Include(s => s.Tasks)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        session.IsUnlocked = false;
        await _context.SaveChangesAsync(cancellationToken);

        return new SessionDto
        {
            Id = session.Id,
            CourseId = session.CourseId,
            Title = session.Title,
            Order = session.Order,
            IsUnlocked = session.IsUnlocked,
            Tasks = session.Tasks.Select(t => new ProgrammingTaskDto
            {
                Id = t.Id,
                SessionId = t.SessionId,
                Title = t.Title,
                Description = t.Description,
                ExampleInput = t.ExampleInput,
                ExampleOutput = t.ExampleOutput,
                PublicTestCasesJson = t.PublicTestCasesJson,
                Deadline = t.Deadline,
                MaxGrade = t.MaxGrade,
                Mode = t.Mode.ToString(),
                MaxAttempts = t.MaxAttempts,
                RunHiddenTestCases = t.RunHiddenTestCases,
                Type = t.Type.ToString(),
                TimeLimitMs = t.TimeLimitMs,
                MemoryLimitMb = t.MemoryLimitMb,
                GradingStrategy = t.GradingStrategy.ToString(),
                IgnoreMultipleSpaces = t.IgnoreMultipleSpaces
            }).ToList()
        };
    }

    public async Task DeleteSessionAsync(Guid sessionId, Guid teacherId, CancellationToken cancellationToken = default)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Id == teacherId, cancellationToken);
        var session = await _context.Sessions
            .Include(s => s.Course)
            .FirstOrDefaultAsync(s => s.Id == sessionId, cancellationToken);

        if (session == null)
        {
            throw new InvalidOperationException("Session not found.");
        }

        if (user == null || (user.Role != Domain.Enums.UserRole.Admin && user.Role != Domain.Enums.UserRole.Teacher))
        {
            throw new UnauthorizedAccessException("You do not have permission to delete sessions.");
        }

        // 1. Get all task IDs for this session
        var tasks = await _context.ProgrammingTasks.Where(t => t.SessionId == sessionId).ToListAsync(cancellationToken);
        var taskIds = tasks.Select(t => t.Id).ToList();

        // 2. Purge Submissions
        var submissions = await _context.Submissions.Where(s => taskIds.Contains(s.TaskId)).ToListAsync(cancellationToken);
        if (submissions.Any()) _context.Submissions.RemoveRange(submissions);

        // 3. Purge UserTaskViews
        var taskViews = await _context.UserTaskViews.Where(v => taskIds.Contains(v.TaskId)).ToListAsync(cancellationToken);
        if (taskViews.Any()) _context.UserTaskViews.RemoveRange(taskViews);

        // 4. Purge Task Notifications
        var notifications = await _context.Notifications.Where(n => n.TaskId.HasValue && taskIds.Contains(n.TaskId.Value)).ToListAsync(cancellationToken);
        if (notifications.Any()) _context.Notifications.RemoveRange(notifications);

        // 5. Nullify ActivityLogs
        var activityLogs = await _context.ActivityLogs.Where(a => a.TaskId.HasValue && taskIds.Contains(a.TaskId.Value)).ToListAsync(cancellationToken);
        foreach (var log in activityLogs)
        {
            log.TaskId = null;
        }

        // 6. Purge Tasks & Session
        if (tasks.Any()) _context.ProgrammingTasks.RemoveRange(tasks);

        _context.Sessions.Remove(session);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
