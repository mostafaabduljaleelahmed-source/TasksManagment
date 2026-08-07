using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Common.Utils;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IGradingCalculator _gradingCalculator;

    public DashboardController(IApplicationDbContext context, IGradingCalculator gradingCalculator)
    {
        _context = context;
        _gradingCalculator = gradingCalculator;
    }

    [HttpGet("teacher/course/{courseId}")]
    public async Task<IActionResult> GetTeacherCourseOverview(Guid courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers can access course dashboard.");
        }

        var totalStudents = await _context.Enrollments
            .CountAsync(e => e.CourseId == courseId, cancellationToken);

        var sessions = await _context.Sessions
            .Where(s => s.CourseId == courseId)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var totalTasks = tasks.Count;

        var taskIds = tasks.Select(t => t.Id).ToList();

        var today = DateTime.UtcNow.Date;
        var submittedToday = await _context.Submissions
            .CountAsync(s => taskIds.Contains(s.TaskId) && s.SubmittedAt >= today, cancellationToken);

        // Get enrollments to calculate student-specific metrics
        var enrollments = await _context.Enrollments
            .Where(e => e.CourseId == courseId)
            .Select(e => e.StudentId)
            .ToListAsync(cancellationToken);

        int pendingSubmissions = 0;
        int lateSubmissions = 0;
        double totalGradesSum = 0;
        int gradesCount = 0;
        int completedTasksCount = 0;
        int totalPossibleAssignments = enrollments.Count * totalTasks;

        var submissions = await _context.Submissions
            .Where(s => taskIds.Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        foreach (var studentId in enrollments)
        {
            foreach (var task in tasks)
            {
                var studentSubmissions = submissions
                    .Where(s => s.StudentId == studentId && s.TaskId == task.Id)
                    .ToList();

                if (!studentSubmissions.Any())
                {
                    pendingSubmissions++;
                }
                else
                {
                    completedTasksCount++;
                    var bestSubmission = studentSubmissions.OrderByDescending(s => s.Grade).First();
                    totalGradesSum += GradeCalculator.CalculatePercentage(bestSubmission.Grade, task.MaxGrade);
                    gradesCount++;

                    if (studentSubmissions.Any(s => s.SubmittedAt > task.Deadline))
                    {
                        lateSubmissions++;
                    }
                }
            }
        }

        double averageGrade = gradesCount > 0 ? (totalGradesSum / gradesCount) : 0;
        double completionRate = totalPossibleAssignments > 0 ? ((double)completedTasksCount / totalPossibleAssignments) * 100 : 0;

        return Ok(new
        {
            TotalStudents = totalStudents,
            TotalTasks = totalTasks,
            SubmittedToday = submittedToday,
            PendingSubmissions = pendingSubmissions,
            LateSubmissions = lateSubmissions,
            AverageCourseGrade = Math.Round(averageGrade, 1),
            CompletionRate = Math.Round(completionRate, 1)
        });
    }

    [HttpGet("teacher/course/{courseId}/session-overview")]
    public async Task<IActionResult> GetTeacherSessionOverview(Guid courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers can access course session overview.");
        }

        var sessions = await _context.Sessions
            .Where(s => s.CourseId == courseId)
            .OrderBy(s => s.Order)
            .ToListAsync(cancellationToken);

        var enrollments = await _context.Enrollments
            .Where(e => e.CourseId == courseId)
            .Select(e => e.StudentId)
            .ToListAsync(cancellationToken);

        var result = new List<object>();

        foreach (var session in sessions)
        {
            var tasks = await _context.ProgrammingTasks
                .Where(t => t.SessionId == session.Id)
                .ToListAsync(cancellationToken);

            var taskIds = tasks.Select(t => t.Id).ToList();

            int studentsFinished = 0;
            int studentsPending = 0;
            double totalGradeSum = 0;
            int gradeCount = 0;
            int totalSubmissionsNeeded = enrollments.Count * tasks.Count;
            int actualSubmissions = 0;

            var submissions = await _context.Submissions
                .Where(s => taskIds.Contains(s.TaskId))
                .ToListAsync(cancellationToken);

            foreach (var studentId in enrollments)
            {
                bool finishedAll = true;
                foreach (var task in tasks)
                {
                    var taskSubs = submissions.Where(s => s.StudentId == studentId && s.TaskId == task.Id).ToList();
                    if (!taskSubs.Any())
                    {
                        finishedAll = false;
                    }
                    else
                    {
                        actualSubmissions++;
                        var bestSub = taskSubs.OrderByDescending(s => s.Grade).First();
                        totalGradeSum += bestSub.Grade;
                        gradeCount++;
                    }
                }

                if (finishedAll && tasks.Any())
                {
                    studentsFinished++;
                }
                else if (tasks.Any())
                {
                    studentsPending++;
                }
            }

            double averageGrade = gradeCount > 0 ? (totalGradeSum / gradeCount) : 0;
            double completionPercentage = totalSubmissionsNeeded > 0 ? ((double)actualSubmissions / totalSubmissionsNeeded) * 100 : 0;

            result.Add(new
            {
                SessionId = session.Id,
                SessionName = session.Title,
                NumberofTasks = tasks.Count,
                StudentsFinished = studentsFinished,
                StudentsPending = studentsPending,
                AverageGrade = Math.Round(averageGrade, 1),
                CompletionPercentage = Math.Round(completionPercentage, 1)
            });
        }

        return Ok(result);
    }

    [HttpGet("teacher/task/{taskId}/overview")]
    public async Task<IActionResult> GetTeacherTaskOverview(Guid taskId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers can access task overview.");
        }

        var task = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null)
        {
            return NotFound("Task not found.");
        }

        var enrollments = await _context.Enrollments
            .Where(e => e.CourseId == task.Session.CourseId)
            .Select(e => e.StudentId)
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => s.TaskId == taskId)
            .ToListAsync(cancellationToken);

        int totalStudents = enrollments.Count;
        int submitted = submissions.Select(s => s.StudentId).Distinct().Count();
        int notSubmitted = Math.Max(0, totalStudents - submitted);

        int late = submissions
            .Where(s => s.SubmittedAt > task.Deadline)
            .Select(s => s.StudentId)
            .Distinct()
            .Count();

        var bestGrades = submissions
            .GroupBy(s => s.StudentId)
            .Select(g => g.Max(s => s.Grade))
            .ToList();

        double averageGrade = bestGrades.Any() ? bestGrades.Average() : 0;
        int highestGrade = bestGrades.Any() ? bestGrades.Max() : 0;
        int lowestGrade = bestGrades.Any() ? bestGrades.Min() : 0;

        var attemptsPerStudent = submissions
            .GroupBy(s => s.StudentId)
            .Select(g => g.Count())
            .ToList();

        double averageAttempts = attemptsPerStudent.Any() ? attemptsPerStudent.Average() : 0;
        double submissionRate = totalStudents > 0 ? ((double)submitted / totalStudents) * 100 : 0;

        return Ok(new
        {
            TotalStudents = totalStudents,
            Submitted = submitted,
            NotSubmitted = notSubmitted,
            Late = late,
            AverageGrade = Math.Round(averageGrade, 1),
            HighestGrade = highestGrade,
            LowestGrade = lowestGrade,
            AverageAttempts = Math.Round(averageAttempts, 1),
            SubmissionRate = Math.Round(submissionRate, 1)
        });
    }

    [HttpGet("teacher/task/{taskId}/submissions")]
    public async Task<IActionResult> GetTeacherTaskSubmissionsList(
        Guid taskId,
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers can access task submissions.");
        }

        var task = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .ThenInclude(s => s.Course)
            .FirstOrDefaultAsync(t => t.Id == taskId, cancellationToken);

        if (task == null)
        {
            return NotFound("Task not found.");
        }

        // Get all students enrolled in the course
        var studentsQuery = _context.Enrollments
            .Include(e => e.Student)
            .Where(e => e.CourseId == task.Session.CourseId)
            .Select(e => e.Student);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchNorm = search.Trim().ToLower();
            studentsQuery = studentsQuery.Where(s => s.Name.ToLower().Contains(searchNorm) || (s.StudentId != null && s.StudentId.ToLower().Contains(searchNorm)));
        }

        var enrolledStudents = await studentsQuery.ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => s.TaskId == taskId)
            .ToListAsync(cancellationToken);

        var views = await _context.UserTaskViews
            .Where(v => v.TaskId == taskId)
            .ToListAsync(cancellationToken);

        var rows = new List<object>();

        foreach (var student in enrolledStudents)
        {
            var studentSubs = submissions.Where(s => s.StudentId == student.Id).ToList();
            var hasOpened = views.Any(v => v.StudentId == student.Id);

            string currentStatus = "Not Opened";
            int? grade = null;
            int attempts = studentSubs.Count;
            DateTime? subTime = null;
            int? execTime = null;
            double? similarity = null;
            Guid? submissionId = null;
            string? submittedCode = null;
            string? teacherFeedback = null;
            string? teacherNotes = null;
            string? consoleOutput = null;
            string? expectedOutput = null;

            if (studentSubs.Any())
            {
                var latest = studentSubs.OrderByDescending(s => s.SubmittedAt).First();
                submissionId = latest.Id;
                grade = latest.Grade;
                subTime = latest.SubmittedAt;
                execTime = latest.ExecutionTimeMs;
                similarity = latest.SimilarityScore;
                submittedCode = latest.Code;
                teacherFeedback = latest.TeacherFeedback;
                teacherNotes = latest.TeacherNotes;
                consoleOutput = latest.ConsoleOutput;
                expectedOutput = latest.ExpectedOutput;

                bool isGraded = !string.IsNullOrWhiteSpace(latest.TeacherFeedback) || latest.Grade > 0;
                bool isLate = task.Mode == ProgrammingTaskMode.Homework && latest.SubmittedAt > task.Deadline;

                if (isGraded)
                {
                    currentStatus = isLate ? "Graded (Late)" : "Graded";
                }
                else
                {
                    currentStatus = isLate ? "Pending Grade (Late)" : "Pending Grade";
                }
            }
            else if (hasOpened)
            {
                currentStatus = "Not Submitted";
            }

            if (!string.IsNullOrWhiteSpace(status) && status != "All")
            {
                if (status == "Graded")
                {
                    if (!currentStatus.StartsWith("Graded")) continue;
                }
                else if (status == "Pending Grade" || status == "Submitted")
                {
                    if (!currentStatus.StartsWith("Pending Grade") && currentStatus != "Submitted") continue;
                }
                else if (status == "Not Submitted")
                {
                    if (currentStatus != "Not Submitted" && currentStatus != "Not Opened") continue;
                }
                else if (!currentStatus.Contains(status, StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }
            }

            rows.Add(new
            {
                SubmissionId = submissionId,
                StudentId = student.Id,
                StudentRegisterId = student.StudentId ?? "-",
                StudentName = student.Name,
                StudentAvatarUrl = student.AvatarUrl,
                CourseName = task.Session?.Course?.Name ?? "Course",
                Status = currentStatus,
                Grade = grade,
                Attempts = attempts,
                SubmissionTime = subTime,
                ExecutionTime = execTime,
                SimilarityScore = similarity,
                SubmittedCode = submittedCode,
                TeacherFeedback = teacherFeedback,
                TeacherNotes = teacherNotes,
                ConsoleOutput = consoleOutput,
                ExpectedOutput = expectedOutput
            });
        }

        // Pagination
        var totalCount = rows.Count;
        var paginatedRows = rows
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        // Calculate hidden test case count safely without revealing test cases
        int hiddenTestCaseCount = 0;
        try
        {
            if (!string.IsNullOrWhiteSpace(task.HiddenTestCasesJson))
            {
                using var doc = System.Text.Json.JsonDocument.Parse(task.HiddenTestCasesJson);
                if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                {
                    hiddenTestCaseCount = doc.RootElement.GetArrayLength();
                }
            }
        }
        catch
        {
            hiddenTestCaseCount = 0;
        }

        return Ok(new
        {
            TaskId = task.Id,
            TaskTitle = task.Title,
            Description = task.Description,
            ExampleInput = task.ExampleInput,
            ExampleOutput = task.ExampleOutput,
            PublicTestCasesJson = task.PublicTestCasesJson,
            HiddenTestCaseCount = hiddenTestCaseCount,
            Deadline = task.Deadline,
            MaxGrade = task.MaxGrade,
            Mode = task.Mode.ToString(),
            GradingStrategy = task.GradingStrategy.ToString(),
            EvaluationMode = task.EvaluationMode.ToString(),
            Language = task.Language,
            AttachmentsJson = task.AttachmentsJson,
            SessionName = task.Session?.Title ?? "Session",
            CourseName = task.Session?.Course?.Name ?? "Course",
            CourseId = task.Session?.CourseId,
            Submissions = paginatedRows,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        });
    }

    [HttpGet("student")]
    public async Task<IActionResult> GetStudentDashboard(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var studentId))
        {
            return Unauthorized("User not found.");
        }

        var enrolledCourses = await _context.Enrollments
            .Include(e => e.Course)
            .ThenInclude(c => c.Teacher)
            .Where(e => e.StudentId == studentId)
            .Select(e => e.Course)
            .ToListAsync(cancellationToken);

        var courseIds = enrolledCourses.Select(c => c.Id).ToList();

        var sessions = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId) && s.IsUnlocked)
            .ToListAsync(cancellationToken);

        var sessionIds = sessions.Select(s => s.Id).ToList();

        var tasks = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .ThenInclude(s => s.Course)
            .Where(t => sessionIds.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => s.StudentId == studentId)
            .ToListAsync(cancellationToken);

        int completed = 0;
        int pending = 0;
        int late = 0;
        var bestGrades = new List<object>();
        var pendingAssignments = new List<object>();
        var completedAssignmentsList = new List<object>();

        foreach (var task in tasks)
        {
            var taskSubs = submissions.Where(s => s.TaskId == task.Id).ToList();
            var highestGradedSub = _gradingCalculator.GetHighestGradedSubmission(taskSubs);
            bool isOverdue = DateTime.UtcNow > task.Deadline;

            if (highestGradedSub == null)
            {
                pending++;
                int attemptsUsed = taskSubs.Count;
                int remainingAttempts = Math.Max(0, task.MaxAttempts - attemptsUsed);

                pendingAssignments.Add(new
                {
                    TaskId = task.Id,
                    Title = task.Title,
                    CourseName = task.Session?.Course?.Name ?? "Course",
                    SessionName = task.Session?.Title ?? "Session",
                    Deadline = task.Deadline,
                    RemainingAttempts = remainingAttempts,
                    Status = isOverdue ? "Late" : "Pending"
                });
            }
            else
            {
                completed++;
                bestGrades.Add(new { TaskTitle = task.Title, BestGrade = highestGradedSub.Grade, MaxGrade = task.MaxGrade });
                
                completedAssignmentsList.Add(new
                {
                    TaskId = task.Id,
                    TaskTitle = task.Title,
                    CourseName = task.Session?.Course?.Name ?? "Course",
                    SessionName = task.Session?.Title ?? "Session",
                    Grade = highestGradedSub.Grade,
                    MaxGrade = task.MaxGrade,
                    TeacherFeedback = !string.IsNullOrWhiteSpace(highestGradedSub.TeacherFeedback) ? highestGradedSub.TeacherFeedback : "No feedback written yet.",
                    SubmittedAt = highestGradedSub.SubmittedAt
                });

                if (taskSubs.Any(s => s.SubmittedAt > task.Deadline))
                {
                    late++;
                }
            }
        }

        var recentFeedback = submissions
            .Where(s => !string.IsNullOrEmpty(s.TeacherFeedback))
            .OrderByDescending(s => s.SubmittedAt)
            .Take(5)
            .Select(s => new
            {
                TaskTitle = s.Task?.Title ?? "Task",
                Feedback = s.TeacherFeedback,
                Grade = s.Grade,
                FeedbackDate = s.SubmittedAt
            })
            .ToList();

        return Ok(new
        {
            CoursesCount = enrolledCourses.Count,
            CompletedTasks = completed,
            PendingTasks = pending,
            LateTasks = late,
            PendingAssignments = pendingAssignments,
            CompletedAssignments = completedAssignmentsList,
            BestGrades = bestGrades,
            RecentFeedback = recentFeedback,
            History = submissions.OrderByDescending(s => s.SubmittedAt).Take(10).Select(s => new {
                SubmissionId = s.Id,
                TaskTitle = s.Task?.Title ?? "Task",
                Grade = s.Grade,
                SubmittedAt = s.SubmittedAt,
                AttemptNumber = s.AttemptNumber
            })
        });
    }

    [HttpGet("notifications")]
    public async Task<IActionResult> GetNotifications(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized("User not found.");
        }

        var notifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt)
            .ToListAsync(cancellationToken);

        return Ok(notifications);
    }

    [HttpPost("notifications/{id}/read")]
    public async Task<IActionResult> MarkNotificationRead(Guid id, CancellationToken cancellationToken)
    {
        var n = await _context.Notifications.FindAsync(new object[] { id }, cancellationToken);
        if (n == null) return NotFound();

        n.IsRead = true;
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true });
    }

    [HttpGet("teacher/course/{courseId}/export")]
    public async Task<IActionResult> ExportCourseGradesCsv(Guid courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers can export course grades.");
        }

        var course = await _context.Courses.FindAsync(new object[] { courseId }, cancellationToken);
        if (course == null) return NotFound("Course not found.");

        var enrollments = await _context.Enrollments
            .Include(e => e.Student)
            .Where(e => e.CourseId == courseId)
            .ToListAsync(cancellationToken);

        var sessions = await _context.Sessions
            .Where(s => s.CourseId == courseId)
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => tasks.Select(t => t.Id).Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var csv = new StringBuilder();
        csv.AppendLine("Student Name,Student ID,Task Title,Grade,Max Grade,Attempts,Submission Time,Status");

        foreach (var e in enrollments)
        {
            foreach (var task in tasks)
            {
                var studentSubs = submissions.Where(s => s.StudentId == e.StudentId && s.TaskId == task.Id).ToList();
                if (studentSubs.Any())
                {
                    var latest = studentSubs.OrderByDescending(s => s.SubmittedAt).First();
                    string status = studentSubs.Any(s => s.SubmittedAt > task.Deadline) ? "Submitted Late" : "Submitted";
                    csv.AppendLine($"\"{e.Student.Name}\",\"{e.Student.StudentId ?? "-"}\",\"{task.Title}\",{latest.Grade},{task.MaxGrade},{studentSubs.Count},\"{latest.SubmittedAt:g}\",\"{status}\"");
                }
                else
                {
                    csv.AppendLine($"\"{e.Student.Name}\",\"{e.Student.StudentId ?? "-"}\",\"{task.Title}\",0,{task.MaxGrade},0,\"-\",\"Not Submitted\"");
                }
            }
        }

        var bytes = Encoding.UTF8.GetBytes(csv.ToString());
        return File(bytes, "text/csv", $"{course.Name.Replace(" ", "_")}_Grades.csv");
    }

    [HttpGet("teacher/analytics")]
    public async Task<IActionResult> GetTeacherAnalytics([FromQuery] Guid? courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if ((role != "Teacher" && role != "Admin") || string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId))
        {
            return Forbid("Only teachers can access analytics.");
        }

        var teacherCourses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);

        var targetCourseIds = courseId.HasValue
            ? new List<Guid> { courseId.Value }
            : teacherCourses.Select(c => c.Id).ToList();

        var sessions = await _context.Sessions
            .Where(s => targetCourseIds.Contains(s.CourseId))
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var taskIds = tasks.Select(t => t.Id).ToList();

        var submissions = await _context.Submissions
            .Include(s => s.Student)
            .Include(s => s.Task)
            .Where(s => taskIds.Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var enrollments = await _context.Enrollments
            .Include(e => e.Student)
            .Where(e => targetCourseIds.Contains(e.CourseId))
            .ToListAsync(cancellationToken);

        var totalStudents = enrollments.Select(e => e.StudentId).Distinct().Count();

        // 7-day trend
        var now = DateTime.UtcNow.Date;
        var submissionTrends = new List<object>();
        for (int i = 6; i >= 0; i--)
        {
            var date = now.AddDays(-i);
            var count = submissions.Count(s => s.SubmittedAt.Date == date);
            submissionTrends.Add(new { Date = date.ToString("MMM dd"), Submissions = count });
        }

        // Hardest tasks (lowest avg grade)
        var taskPerformance = tasks.Select(task =>
        {
            var taskSubs = submissions.Where(s => s.TaskId == task.Id).ToList();
            var studentBestPcts = taskSubs.GroupBy(s => s.StudentId).Select(g => GradeCalculator.CalculatePercentage(g.Max(s => s.Grade), task.MaxGrade)).ToList();
            double avgPct = studentBestPcts.Any() ? studentBestPcts.Average() : 0;
            return new
            {
                TaskId = task.Id,
                TaskTitle = task.Title,
                MaxGrade = task.MaxGrade,
                AverageGrade = Math.Round(avgPct, 1),
                SubmissionsCount = taskSubs.Count
            };
        }).OrderBy(t => t.AverageGrade).Take(5).ToList();

        // Top active students
        var topStudents = submissions
            .GroupBy(s => new { StudentDbId = s.StudentId, StudentName = s.Student.Name, RegisterId = s.Student.StudentId })
            .Select(g => new
            {
                StudentId = g.Key.StudentDbId,
                StudentName = g.Key.StudentName,
                RegisterId = g.Key.RegisterId ?? "-",
                SubmissionsCount = g.Count(),
                AverageGrade = Math.Round(g.Average(s => GradeCalculator.CalculatePercentage(s.Grade, s.Task?.MaxGrade ?? 100)), 1)
            })
            .OrderByDescending(s => s.SubmissionsCount)
            .Take(5)
            .ToList();

        // Pending review list
        var pendingReviews = _gradingCalculator.GetPendingReviews(submissions)
            .Take(10)
            .Select(s => new
            {
                SubmissionId = s.Id,
                StudentId = s.StudentId,
                StudentName = s.Student.Name,
                StudentRegisterId = s.Student.StudentId ?? "-",
                TaskId = s.TaskId,
                TaskTitle = s.Task?.Title ?? "Task",
                MaxGrade = s.Task?.MaxGrade ?? 100,
                SubmittedAt = s.SubmittedAt,
                AttemptNumber = s.AttemptNumber
            })
            .ToList();

        double overallAvg = submissions.Any() ? Math.Round(submissions.Average(s => s.Grade), 1) : 0;

        return Ok(new
        {
            TotalCourses = teacherCourses.Count,
            TotalStudents = totalStudents,
            TotalTasks = tasks.Count,
            TotalSubmissions = submissions.Count,
            OverallAverageGrade = overallAvg,
            SubmissionTrends = submissionTrends,
            DifficultTasks = taskPerformance,
            TopActiveStudents = topStudents,
            PendingReviews = pendingReviews
        });
    }

    [HttpGet("student/profile")]
    public async Task<IActionResult> GetStudentProfile(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var studentId))
        {
            return Unauthorized("User not found.");
        }

        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
        if (student == null) return NotFound("Student not found.");

        var enrollments = await _context.Enrollments
            .Include(e => e.Course)
            .Where(e => e.StudentId == studentId)
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Include(s => s.Task)
            .Where(s => s.StudentId == studentId)
            .OrderByDescending(s => s.SubmittedAt)
            .ToListAsync(cancellationToken);

        var courseIds = enrollments.Select(e => e.CourseId).ToList();
        var totalTasksAssigned = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId) && s.IsUnlocked)
            .SelectMany(s => s.Tasks)
            .CountAsync(cancellationToken);

        var assignedTasks = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId) && s.IsUnlocked)
            .SelectMany(s => s.Tasks)
            .ToListAsync(cancellationToken);

        int completedCount = assignedTasks.Count(t => _gradingCalculator.GetHighestGradedSubmission(submissions.Where(s => s.TaskId == t.Id)) != null);
        double averageGrade = _gradingCalculator.CalculateStudentAverageGrade(assignedTasks, submissions);
        double completionRate = totalTasksAssigned > 0 ? Math.Round(((double)completedCount / totalTasksAssigned) * 100, 1) : 0;

        var historyList = submissions.Select(s => new
        {
            SubmissionId = s.Id,
            TaskId = s.TaskId,
            TaskTitle = s.Task?.Title ?? "Assignment",
            MaxGrade = s.Task?.MaxGrade ?? 100,
            Grade = s.Grade,
            TeacherFeedback = s.TeacherFeedback ?? "",
            SubmittedAt = s.SubmittedAt,
            AttemptNumber = s.AttemptNumber,
            Code = s.Code
        }).ToList();

        return Ok(new
        {
            StudentInfo = new
            {
                Id = student.Id,
                Name = student.Name,
                Email = student.Email,
                StudentRegisterId = student.StudentId ?? "ST-001",
                Role = student.Role
            },
            Metrics = new
            {
                EnrolledCoursesCount = enrollments.Count,
                CompletedTasks = completedCount,
                TotalAssignedTasks = totalTasksAssigned,
                CompletionRate = completionRate,
                AverageGrade = averageGrade,
                TotalSubmissionsCount = submissions.Count
            },
            EnrolledCourses = enrollments.Select(e => new
            {
                CourseId = e.CourseId,
                CourseName = e.Course.Name,
                CourseCode = e.Course.CourseCode
            }),
            History = historyList
        });
    }

    [HttpGet("leaderboard")]
    public async Task<IActionResult> GetLeaderboard([FromQuery] Guid? courseId, CancellationToken cancellationToken)
    {
        IQueryable<Enrollment> enrollmentsQuery = _context.Enrollments.Include(e => e.Student);
        if (courseId.HasValue)
        {
            enrollmentsQuery = enrollmentsQuery.Where(e => e.CourseId == courseId.Value);
        }

        var enrollments = await enrollmentsQuery.ToListAsync(cancellationToken);
        var studentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();

        var submissions = await _context.Submissions
            .Include(s => s.Task)
            .Where(s => studentIds.Contains(s.StudentId))
            .ToListAsync(cancellationToken);

        var targetCourseIds = courseId.HasValue
            ? new List<Guid> { courseId.Value }
            : enrollments.Select(e => e.CourseId).Distinct().ToList();

        var assignedTasks = await _context.Sessions
            .Where(s => targetCourseIds.Contains(s.CourseId) && s.IsUnlocked)
            .SelectMany(s => s.Tasks)
            .ToListAsync(cancellationToken);

        var leaderboard = new List<object>();

        foreach (var studentId in studentIds)
        {
            var studentObj = enrollments.FirstOrDefault(e => e.StudentId == studentId)?.Student;
            if (studentObj == null) continue;

            var studentSubs = submissions.Where(s => s.StudentId == studentId).ToList();
            
            // Filter assigned tasks for this student's specific enrolled course
            var studentEnrolledCourseIds = enrollments.Where(e => e.StudentId == studentId).Select(e => e.CourseId).ToList();
            var studentTasks = assignedTasks.Where(t => t.Session != null && studentEnrolledCourseIds.Contains(t.Session.CourseId)).ToList();
            if (!studentTasks.Any()) studentTasks = assignedTasks;

            double avgGrade = _gradingCalculator.CalculateStudentAverageGrade(studentTasks, studentSubs);

            int completedTasks = studentTasks.Count(t => _gradingCalculator.GetHighestGradedSubmission(studentSubs.Where(s => s.TaskId == t.Id)) != null);
            int totalSubmissions = studentSubs.Count;

            leaderboard.Add(new
            {
                StudentId = studentObj.Id,
                StudentName = studentObj.Name,
                StudentRegisterId = studentObj.StudentId ?? "-",
                AverageGrade = avgGrade,
                CompletedTasks = completedTasks,
                TotalSubmissions = totalSubmissions
            });
        }

        var sortedByGrade = leaderboard
            .OrderByDescending(x => ((dynamic)x).AverageGrade)
            .ThenByDescending(x => ((dynamic)x).CompletedTasks)
            .ToList();

        var sortedByCompleted = leaderboard
            .OrderByDescending(x => ((dynamic)x).CompletedTasks)
            .ThenByDescending(x => ((dynamic)x).AverageGrade)
            .ToList();

        return Ok(new
        {
            ByGrade = sortedByGrade,
            ByCompleted = sortedByCompleted
        });
    }

    [HttpGet("teacher/summary")]
    public async Task<IActionResult> GetTeacherSummary(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId) || (role != "Teacher" && role != "Admin"))
        {
            return Forbid("Only teachers can access summary.");
        }

        var courses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);

        var courseIds = courses.Select(c => c.Id).ToList();

        var enrollments = await _context.Enrollments
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync(cancellationToken);

        var uniqueStudentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();

        var sessions = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId))
            .Select(s => s.Id)
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var taskIds = tasks.Select(t => t.Id).ToList();

        var submissions = await _context.Submissions
            .Where(s => taskIds.Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var today = DateTime.UtcNow.Date;
        int submittedToday = submissions.Count(s => s.SubmittedAt >= today);

        // Ungraded submissions count (distinct per student/task)
        int pendingReviews = _gradingCalculator.GetPendingReviews(submissions)
            .Select(s => new { s.StudentId, s.TaskId })
            .Distinct()
            .Count();

        // Missing submissions calculation: count tasks where enrolled student has 0 submissions
        int missingSubmissions = 0;
        foreach (var course in courses)
        {
            var courseSessionIds = await _context.Sessions
                .Where(s => s.CourseId == course.Id)
                .Select(s => s.Id)
                .ToListAsync(cancellationToken);

            var courseTaskIds = tasks.Where(t => courseSessionIds.Contains(t.SessionId)).Select(t => t.Id).ToList();
            var courseStudentIds = enrollments.Where(e => e.CourseId == course.Id).Select(e => e.StudentId).ToList();

            foreach (var studentId in courseStudentIds)
            {
                foreach (var taskId in courseTaskIds)
                {
                    if (!submissions.Any(s => s.StudentId == studentId && s.TaskId == taskId))
                    {
                        missingSubmissions++;
                    }
                }
            }
        }

        int overdueAssignments = tasks.Count(t => t.Mode == ProgrammingTaskMode.Homework && t.Deadline < DateTime.UtcNow);

        return Ok(new
        {
            PendingReviewsCount = pendingReviews,
            MissingSubmissionsCount = missingSubmissions,
            SubmittedTodayCount = submittedToday,
            TotalGroupsCount = courses.Count,
            TotalStudentsCount = uniqueStudentIds.Count,
            OverdueAssignmentsCount = overdueAssignments
        });
    }

    [HttpGet("teacher/groups")]
    public async Task<IActionResult> GetTeacherGroups(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId) || (role != "Teacher" && role != "Admin"))
        {
            return Forbid("Only teachers can access groups.");
        }

        var courses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);

        var courseIds = courses.Select(c => c.Id).ToList();

        var enrollments = await _context.Enrollments
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync(cancellationToken);

        var sessions = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId))
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Select(s => s.Id).Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => tasks.Select(t => t.Id).Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var result = new List<object>();

        foreach (var c in courses)
        {
            var groupSessionIds = sessions.Where(s => s.CourseId == c.Id).Select(s => s.Id).ToList();
            var groupTasks = tasks.Where(t => groupSessionIds.Contains(t.SessionId)).ToList();
            var groupTaskIds = groupTasks.Select(t => t.Id).ToList();
            var groupStudents = enrollments.Where(e => e.CourseId == c.Id).Select(e => e.StudentId).ToList();

            var groupSubmissions = submissions.Where(s => groupTaskIds.Contains(s.TaskId)).ToList();

            int pendingReviews = groupSubmissions
                .Where(s => s.Grade == 0 && string.IsNullOrWhiteSpace(s.TeacherFeedback))
                .Select(s => new { s.StudentId, s.TaskId })
                .Distinct()
                .Count();
            
            int missingSubmissions = 0;
            foreach (var sId in groupStudents)
            {
                foreach (var tId in groupTaskIds)
                {
                    if (!groupSubmissions.Any(s => s.StudentId == sId && s.TaskId == tId))
                    {
                        missingSubmissions++;
                    }
                }
            }

            result.Add(new
            {
                GroupId = c.Id,
                GroupName = c.Name,
                GroupCode = c.CourseCode,
                StudentsCount = groupStudents.Count,
                AssignmentsCount = groupTasks.Count,
                PendingReviewsCount = pendingReviews,
                MissingSubmissionsCount = missingSubmissions
            });
        }

        return Ok(result);
    }

    [HttpGet("teacher/students")]
    public async Task<IActionResult> GetTeacherStudents(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId) || (role != "Teacher" && role != "Admin"))
        {
            return Forbid("Only teachers can access students roster.");
        }

        var courses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);

        var courseIds = courses.Select(c => c.Id).ToList();

        var enrollments = await _context.Enrollments
            .Include(e => e.Student)
            .Include(e => e.Course)
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync(cancellationToken);

        var sessions = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId))
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Select(s => s.Id).Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => tasks.Select(t => t.Id).Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var studentList = new List<object>();

        foreach (var e in enrollments)
        {
            var student = e.Student;
            if (student == null) continue;

            var courseSessionIds = sessions.Where(s => s.CourseId == e.CourseId).Select(s => s.Id).ToList();
            var courseTasks = tasks.Where(t => courseSessionIds.Contains(t.SessionId)).ToList();
            var courseTaskIds = courseTasks.Select(t => t.Id).ToList();

            var studentSubs = submissions.Where(s => s.StudentId == student.Id && courseTaskIds.Contains(s.TaskId)).ToList();

            var bestPerTask = studentSubs
                .GroupBy(s => s.TaskId)
                .Select(g => g.Max(s => s.Grade))
                .ToList();

            double avgGrade = bestPerTask.Any() ? Math.Round(bestPerTask.Average(), 1) : 0;
            int completedTasks = bestPerTask.Count;
            int pendingTasks = Math.Max(0, courseTasks.Count - completedTasks);

            int lateTasks = 0;
            foreach (var t in courseTasks)
            {
                var taskSubs = studentSubs.Where(s => s.TaskId == t.Id).ToList();
                if (taskSubs.Any(s => t.Mode == ProgrammingTaskMode.Homework && s.SubmittedAt > t.Deadline))
                {
                    lateTasks++;
                }
            }

            studentList.Add(new
            {
                StudentId = student.Id,
                Name = student.Name,
                Email = student.Email,
                StudentRegisterId = student.StudentId ?? "-",
                AvatarUrl = student.AvatarUrl,
                GroupName = e.Course.Name,
                CourseId = e.CourseId,
                AverageGrade = avgGrade,
                CompletedAssignments = completedTasks,
                PendingAssignments = pendingTasks,
                LateAssignments = lateTasks
            });
        }

        return Ok(studentList);
    }

    [HttpPost("teacher/students/{studentId}/reset-password")]
    public async Task<IActionResult> ResetStudentPassword(
        Guid studentId,
        [FromBody] ResetPasswordDto dto,
        [FromServices] IHashService hashService,
        CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher" && role != "Admin")
        {
            return Forbid("Only teachers can reset student passwords.");
        }

        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 4)
        {
            return BadRequest(new { message = "Password must be at least 4 characters long." });
        }

        var student = await _context.Users.FirstOrDefaultAsync(u => u.Id == studentId, cancellationToken);
        if (student == null)
        {
            return NotFound(new { message = "Student not found." });
        }

        student.PasswordHash = hashService.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { message = $"Password for student '{student.Name}' has been reset successfully." });
    }

    public class ResetPasswordDto
    {
        public string NewPassword { get; set; } = string.Empty;
    }

    [HttpGet("teacher/pending-reviews")]
    public async Task<IActionResult> GetTeacherPendingReviews([FromQuery] string? sortBy, CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId) || (role != "Teacher" && role != "Admin"))
        {
            return Forbid("Only teachers can access pending reviews.");
        }

        var courses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);

        var courseIds = courses.Select(c => c.Id).ToList();

        var sessions = await _context.Sessions
            .Where(s => courseIds.Contains(s.CourseId))
            .ToListAsync(cancellationToken);

        var tasks = await _context.ProgrammingTasks
            .Where(t => sessions.Select(s => s.Id).Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var taskIds = tasks.Select(t => t.Id).ToList();

        // Get submissions that are pending manual teacher review (Status == Pending and !IsReviewed)
        var pendingSubsRaw = await _context.Submissions
            .Include(s => s.Student)
            .Include(s => s.Task)
            .ThenInclude(t => t.Session)
            .ThenInclude(sess => sess.Course)
            .Where(s => taskIds.Contains(s.TaskId) && (s.Status == SubmissionStatus.Pending || !s.IsReviewed))
            .ToListAsync(cancellationToken);

        var pendingSubs = _gradingCalculator.GetPendingReviews(pendingSubsRaw)
            .GroupBy(s => new { s.StudentId, s.TaskId })
            .Select(g => g.OrderByDescending(s => s.SubmittedAt).First())
            .ToList();

        var items = pendingSubs.Select(s => new
        {
            SubmissionId = s.Id,
            StudentId = s.StudentId,
            StudentName = s.Student.Name,
            StudentRegisterId = s.Student.StudentId ?? "-",
            StudentAvatarUrl = s.Student.AvatarUrl,
            TaskId = s.TaskId,
            TaskTitle = s.Task.Title,
            MaxGrade = s.Task.MaxGrade,
            Deadline = s.Task.Deadline,
            GroupName = s.Task.Session.Course.Name,
            SubmittedAt = s.SubmittedAt,
            AttemptNumber = s.AttemptNumber,
            Code = s.Code
        }).ToList();

        // Sorting
        var sorted = sortBy?.ToLowerInvariant() switch
        {
            "oldest" => items.OrderBy(x => x.SubmittedAt).ToList(),
            "deadline" => items.OrderBy(x => x.Deadline).ToList(),
            "group" => items.OrderBy(x => x.GroupName).ThenByDescending(x => x.SubmittedAt).ToList(),
            "task" => items.OrderBy(x => x.TaskTitle).ThenByDescending(x => x.SubmittedAt).ToList(),
            "student" => items.OrderBy(x => x.StudentName).ThenByDescending(x => x.SubmittedAt).ToList(),
            _ => items.OrderByDescending(x => x.SubmittedAt).ToList() // default newest
        };

        return Ok(sorted);
    }

    [HttpGet("teacher/today-activity")]
    public async Task<IActionResult> GetTeacherTodayActivity(CancellationToken cancellationToken)
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var role = User.FindFirst(ClaimTypes.Role)?.Value;

        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId) || (role != "Teacher" && role != "Admin"))
        {
            return Forbid("Only teachers can access today's activity.");
        }

        var courses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);
        var courseIds = courses.Select(c => c.Id).ToList();
        var sessions = await _context.Sessions.Where(s => courseIds.Contains(s.CourseId)).ToListAsync(cancellationToken);
        var tasks = await _context.ProgrammingTasks.Where(t => sessions.Select(s => s.Id).Contains(t.SessionId)).ToListAsync(cancellationToken);
        var taskIds = tasks.Select(t => t.Id).ToList();

        var today = DateTime.UtcNow.Date;
        var todaySubs = await _context.Submissions
            .Include(s => s.Student)
            .Include(s => s.Task)
            .ThenInclude(t => t.Session)
            .ThenInclude(sess => sess.Course)
            .Where(s => taskIds.Contains(s.TaskId) && s.SubmittedAt >= today)
            .OrderByDescending(s => s.SubmittedAt)
            .Take(25)
            .ToListAsync(cancellationToken);

        var result = todaySubs.Select(s => new
        {
            SubmissionId = s.Id,
            StudentId = s.StudentId,
            StudentName = s.Student.Name,
            StudentRegisterId = s.Student.StudentId ?? "-",
            StudentAvatarUrl = s.Student.AvatarUrl,
            TaskId = s.TaskId,
            TaskTitle = s.Task.Title,
            GroupName = s.Task.Session.Course.Name,
            SubmittedAt = s.SubmittedAt,
            Grade = s.Grade,
            Status = s.Grade > 0 || !string.IsNullOrWhiteSpace(s.TeacherFeedback) ? "Graded" : "Pending Review"
        });

        return Ok(result);
    }

    [HttpGet("search")]
    public async Task<IActionResult> GlobalSearch([FromQuery] string? q, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(q) || q.Trim().Length < 1)
        {
            return Ok(new { students = new object[0], courses = new object[0], sessions = new object[0], assignments = new object[0] });
        }

        var query = q.Trim().ToLower();

        // 1. Search Students
        var students = await _context.Users
            .Where(u => u.Role == UserRole.Student && (
                u.Name.ToLower().Contains(query) ||
                u.Email.ToLower().Contains(query) ||
                (u.StudentId != null && u.StudentId.ToLower().Contains(query))
            ))
            .Take(8)
            .Select(u => new
            {
                id = u.Id,
                name = u.Name,
                registerId = u.StudentId ?? "-",
                avatarUrl = u.AvatarUrl,
                email = u.Email
            })
            .ToListAsync(cancellationToken);

        // 2. Search Courses
        var courses = await _context.Courses
            .Where(c => c.Name.ToLower().Contains(query) || c.CourseCode.ToLower().Contains(query) || c.Description.ToLower().Contains(query))
            .Take(8)
            .Select(c => new
            {
                id = c.Id,
                name = c.Name,
                courseCode = c.CourseCode,
                description = c.Description
            })
            .ToListAsync(cancellationToken);

        // 3. Search Sessions
        var sessions = await _context.Sessions
            .Include(s => s.Course)
            .Where(s => s.Title.ToLower().Contains(query) || s.Course.Name.ToLower().Contains(query))
            .Take(8)
            .Select(s => new
            {
                id = s.Id,
                title = s.Title,
                order = s.Order,
                courseId = s.CourseId,
                courseName = s.Course.Name
            })
            .ToListAsync(cancellationToken);

        // 4. Search Assignments (ProgrammingTasks)
        var assignments = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .ThenInclude(sess => sess.Course)
            .Where(t => t.Title.ToLower().Contains(query) || t.Description.ToLower().Contains(query) || t.Session.Course.Name.ToLower().Contains(query))
            .Take(8)
            .Select(t => new
            {
                id = t.Id,
                title = t.Title,
                courseId = t.Session.CourseId,
                courseName = t.Session.Course.Name,
                sessionName = t.Session.Title,
                deadline = t.Deadline,
                maxGrade = t.MaxGrade
            })
            .ToListAsync(cancellationToken);

        return Ok(new
        {
            students,
            courses,
            sessions,
            assignments
        });
    }

    [HttpGet("teacher/assignments")]
    public async Task<IActionResult> GetTeacherAssignmentsList(CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if ((role != "Teacher" && role != "Admin") || string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId))
        {
            return Forbid("Only teachers can access assignments list.");
        }

        var teacherCourses = role == "Admin"
            ? await _context.Courses.ToListAsync(cancellationToken)
            : await _context.Courses.Where(c => c.TeacherId == teacherId).ToListAsync(cancellationToken);

        var courseIds = teacherCourses.Select(c => c.Id).ToList();

        var sessions = await _context.Sessions
            .Include(s => s.Course)
            .Where(s => courseIds.Contains(s.CourseId))
            .ToListAsync(cancellationToken);

        var sessionIds = sessions.Select(s => s.Id).ToList();

        var tasks = await _context.ProgrammingTasks
            .Include(t => t.Session)
            .ThenInclude(s => s.Course)
            .Where(t => sessionIds.Contains(t.SessionId) && !t.IsArchived)
            .OrderByDescending(t => t.CreatedAt)
            .ToListAsync(cancellationToken);

        var enrollments = await _context.Enrollments
            .Where(e => courseIds.Contains(e.CourseId))
            .ToListAsync(cancellationToken);

        var taskIds = tasks.Select(t => t.Id).ToList();

        var submissions = await _context.Submissions
            .Where(s => taskIds.Contains(s.TaskId))
            .ToListAsync(cancellationToken);

        var result = new List<object>();

        foreach (var task in tasks)
        {
            var courseId = task.Session.CourseId;
            var courseStudentIds = enrollments.Where(e => e.CourseId == courseId).Select(e => e.StudentId).Distinct().ToList();
            int totalStudents = courseStudentIds.Count;

            var taskSubs = submissions.Where(s => s.TaskId == task.Id).ToList();
            var submittedStudentIds = taskSubs.Select(s => s.StudentId).Distinct().ToList();

            int submitted = submittedStudentIds.Count;
            int missing = Math.Max(0, totalStudents - submitted);

            int pendingReview = _gradingCalculator.GetPendingReviews(taskSubs)
                .Select(s => s.StudentId)
                .Distinct()
                .Count();

            var bestGrades = taskSubs
                .GroupBy(s => s.StudentId)
                .Select(g => _gradingCalculator.GetHighestGradedSubmission(g)?.Grade)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .ToList();

            double averageGrade = bestGrades.Any() ? Math.Round(bestGrades.Average(), 1) : 0;

            result.Add(new
            {
                Id = task.Id,
                Title = task.Title,
                Deadline = task.Deadline,
                MaxGrade = task.MaxGrade,
                TotalStudents = totalStudents,
                Submitted = submitted,
                Missing = missing,
                PendingReview = pendingReview,
                AverageGrade = averageGrade,
                CourseName = task.Session.Course.Name,
                SessionName = task.Session.Title
            });
        }

        return Ok(result);
    }
}

