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
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class DashboardController : ControllerBase
{
    private readonly IApplicationDbContext _context;

    public DashboardController(IApplicationDbContext context)
    {
        _context = context;
    }

    [HttpGet("teacher/course/{courseId}")]
    public async Task<IActionResult> GetTeacherCourseOverview(Guid courseId, CancellationToken cancellationToken)
    {
        var role = User.FindFirst(ClaimTypes.Role)?.Value;
        if (role != "Teacher")
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
                    totalGradesSum += bestSubmission.Grade;
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
        if (role != "Teacher")
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
        if (role != "Teacher")
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
        if (role != "Teacher")
        {
            return Forbid("Only teachers can access task submissions.");
        }

        var task = await _context.ProgrammingTasks
            .Include(t => t.Session)
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

            if (studentSubs.Any())
            {
                var latest = studentSubs.OrderByDescending(s => s.SubmittedAt).First();
                submissionId = latest.Id;
                grade = latest.Grade;
                subTime = latest.SubmittedAt;
                execTime = latest.ExecutionTimeMs;
                similarity = latest.SimilarityScore;

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
                Status = currentStatus,
                Grade = grade,
                Attempts = attempts,
                SubmissionTime = subTime,
                ExecutionTime = execTime,
                SimilarityScore = similarity
            });
        }

        // Pagination
        var totalCount = rows.Count;
        var paginatedRows = rows
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return Ok(new
        {
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
            .Where(t => sessionIds.Contains(t.SessionId))
            .ToListAsync(cancellationToken);

        var submissions = await _context.Submissions
            .Where(s => s.StudentId == studentId)
            .ToListAsync(cancellationToken);

        int completed = 0;
        int pending = 0;
        int late = 0;
        var bestGrades = new List<object>();

        foreach (var task in tasks)
            {
                var taskSubs = submissions.Where(s => s.TaskId == task.Id).ToList();
                if (!taskSubs.Any())
                {
                    pending++;
                }
                else
                {
                    completed++;
                    var best = taskSubs.Max(s => s.Grade);
                    bestGrades.Add(new { TaskTitle = task.Title, BestGrade = best, MaxGrade = task.MaxGrade });
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
        if (role != "Teacher")
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
        if (role != "Teacher" || string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var teacherId))
        {
            return Forbid("Only teachers can access analytics.");
        }

        var teacherCourses = await _context.Courses
            .Where(c => c.TeacherId == teacherId)
            .ToListAsync(cancellationToken);

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
            var studentBest = taskSubs.GroupBy(s => s.StudentId).Select(g => g.Max(s => s.Grade)).ToList();
            double avg = studentBest.Any() ? studentBest.Average() : 0;
            return new
            {
                TaskId = task.Id,
                TaskTitle = task.Title,
                MaxGrade = task.MaxGrade,
                AverageGrade = Math.Round(avg, 1),
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
                AverageGrade = Math.Round(g.Average(s => s.Grade), 1)
            })
            .OrderByDescending(s => s.SubmissionsCount)
            .Take(5)
            .ToList();

        // Pending review list
        var pendingReviews = submissions
            .Where(s => string.IsNullOrEmpty(s.TeacherFeedback) && s.Grade == 0)
            .OrderByDescending(s => s.SubmittedAt)
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

        var completedTaskIds = submissions.Select(s => s.TaskId).Distinct().ToList();
        int completedCount = completedTaskIds.Count;

        var bestGrades = submissions
            .GroupBy(s => s.TaskId)
            .Select(g => g.Max(s => s.Grade))
            .ToList();

        double averageGrade = bestGrades.Any() ? Math.Round(bestGrades.Average(), 1) : 0;
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
            .Where(s => studentIds.Contains(s.StudentId))
            .ToListAsync(cancellationToken);

        var leaderboard = new List<object>();

        foreach (var studentId in studentIds)
        {
            var studentObj = enrollments.FirstOrDefault(e => e.StudentId == studentId)?.Student;
            if (studentObj == null) continue;

            var studentSubs = submissions.Where(s => s.StudentId == studentId).ToList();
            var bestPerTask = studentSubs
                .GroupBy(s => s.TaskId)
                .Select(g => g.Max(s => s.Grade))
                .ToList();

            double avgGrade = bestPerTask.Any() ? Math.Round(bestPerTask.Average(), 1) : 0;
            int completedTasks = bestPerTask.Count;
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
}
