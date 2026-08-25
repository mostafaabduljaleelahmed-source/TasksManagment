using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Dashboard.Dtos;
using Platform.Application.Features.Submissions.Dtos;
using Platform.Application.Services;
using Platform.Domain.Entities;
using Platform.Domain.Enums;
using Platform.Infrastructure.Persistence;
using Xunit;

namespace Platform.UnitTests;

/// <summary>
/// End-to-end check that grading a submission through the real teacher-review code path
/// (SubmissionService.ReviewSubmissionAsync -- the same call the "Review" button in the app
/// makes) actually changes what the leaderboard reports.
///
/// Every read below opens a BRAND NEW DbContext against the same backing database, exactly like
/// production: ASP.NET Core hands each HTTP request its own freshly-scoped DbContext, so nothing
/// is pre-tracked when DashboardController.GetLeaderboard runs its query. An earlier version of
/// this test reused one long-lived context for both seeding and reading, which accidentally
/// pre-tracked the Session entities and masked a real bug: querying tasks via
/// `Sessions.SelectMany(s => s.Tasks)` leaves Task.Session null on a fresh context (no Include,
/// no prior tracked Session to fix up against), which silently zeroed every student's task count
/// in production while the same query appeared to work fine in a same-context test.
/// </summary>
public class LeaderboardGradingIntegrationTests
{
    private static DbContextOptions<ApplicationDbContext> MakeOptions(string dbName) =>
        new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(dbName).Options;

    private static async Task<LeaderboardEntryDto> ReadLeaderboardEntry(string dbName, Guid courseId, Guid studentId)
    {
        // A fresh, untracked context -- exactly what DashboardController gets per request.
        using var context = new ApplicationDbContext(MakeOptions(dbName));

        var enrollments = await context.Enrollments.Include(e => e.Student).Where(e => e.CourseId == courseId).ToListAsync();
        var studentIds = enrollments.Select(e => e.StudentId).Distinct().ToList();
        var submissions = await context.Submissions.Include(s => s.Task).Where(s => studentIds.Contains(s.StudentId)).ToListAsync();

        var sessionIds = await context.Sessions
            .Where(s => s.CourseId == courseId && !s.IsArchived)
            .Select(s => s.Id)
            .ToListAsync();
        var assignedTasks = await context.ProgrammingTasks
            .Include(t => t.Session)
            .Where(t => sessionIds.Contains(t.SessionId) && !t.IsArchived)
            .ToListAsync();

        var leaderboard = new GradingCalculator().BuildLeaderboard(enrollments, submissions, assignedTasks);
        return leaderboard.Single(e => e.StudentId == studentId);
    }

    [Fact]
    public async Task GradingAnUnreviewedSubmission_UpdatesTheLeaderboard()
    {
        var dbName = Guid.NewGuid().ToString();

        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Zainab", Email = "zainab@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var task = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task A", MaxGrade = 100, Deadline = DateTime.UtcNow.AddDays(7) };
        var submissionId = Guid.NewGuid();

        using (var seedContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            seedContext.Users.AddRange(teacher, student);
            seedContext.Courses.Add(course);
            seedContext.Sessions.Add(session);
            seedContext.ProgrammingTasks.Add(task);
            seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
            // Simulates "reset review": a submission that exists but has never been graded --
            // Status=Pending, IsReviewed=false, Grade=0 -- exactly what a reset-review action leaves.
            seedContext.Submissions.Add(new Submission
            {
                Id = submissionId,
                TaskId = task.Id,
                Task = task,
                StudentId = student.Id,
                Student = student,
                Code = "print(1)",
                Grade = 0,
                Status = SubmissionStatus.Pending,
                IsReviewed = false,
                AttemptNumber = 1,
                SubmittedAt = DateTime.UtcNow,
            });
            await seedContext.SaveChangesAsync();
        }

        // 1) Before grading: the student is on the leaderboard (enrolled, task assigned) but
        //    nothing is graded yet -- 0 completed, 0 marks.
        var before = await ReadLeaderboardEntry(dbName, course.Id, student.Id);
        Assert.Equal(1, before.TotalTasks);
        Assert.Equal(0, before.CompletedTasks);
        Assert.Equal(0, before.TotalScore);
        Assert.Equal(0.0, before.AverageGrade);

        // 2) Grade it through the real review code path -- the same call the "Review" button in
        //    the teacher UI makes -- on its own fresh context, like a real request.
        using (var gradingContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            var submissionService = new SubmissionService(
                gradingContext,
                Mock.Of<IExecutionService>(),
                new LanguageRegistry(),
                Mock.Of<IGradingEngineDispatcher>(),
                NullLogger<SubmissionService>.Instance,
                Mock.Of<IActivityLogger>(),
                Mock.Of<IEmailService>());

            await submissionService.ReviewSubmissionAsync(submissionId, new ReviewSubmissionDto
            {
                Grade = 85,
                TeacherFeedback = "Nice work.",
                TeacherNotes = "",
            });
        }

        // 3) After grading: the leaderboard must reflect it immediately, read from yet another
        //    fresh context.
        var after = await ReadLeaderboardEntry(dbName, course.Id, student.Id);
        Assert.Equal(1, after.TotalTasks);
        Assert.Equal(1, after.CompletedTasks);
        Assert.Equal(85, after.TotalScore);
        Assert.Equal(100, after.TotalPossibleScore);
        Assert.Equal(85.0, after.AverageGrade);
    }

    [Fact]
    public async Task GradingASubmission_InALockedSession_StillUpdatesTheLeaderboard()
    {
        // Regression guard: locking a session after grading (a normal "close submissions after
        // the deadline" workflow) must not make the grade disappear from the leaderboard.
        var dbName = Guid.NewGuid().ToString();

        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Hassan", Email = "hassan@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        // Session is LOCKED (IsUnlocked = false), as it would be after a teacher closes the window.
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = false };
        var task = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task A", MaxGrade = 100, Deadline = DateTime.UtcNow.AddDays(-1) };

        using (var seedContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            seedContext.Users.AddRange(teacher, student);
            seedContext.Courses.Add(course);
            seedContext.Sessions.Add(session);
            seedContext.ProgrammingTasks.Add(task);
            seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
            seedContext.Submissions.Add(new Submission
            {
                Id = Guid.NewGuid(),
                TaskId = task.Id,
                Task = task,
                StudentId = student.Id,
                Student = student,
                Grade = 90,
                Status = SubmissionStatus.Graded,
                IsReviewed = true,
                AttemptNumber = 1,
                SubmittedAt = DateTime.UtcNow,
            });
            await seedContext.SaveChangesAsync();
        }

        var entry = await ReadLeaderboardEntry(dbName, course.Id, student.Id);

        Assert.Equal(1, entry.TotalTasks);
        Assert.Equal(1, entry.CompletedTasks);
        Assert.Equal(90, entry.TotalScore);
        Assert.Equal(90.0, entry.AverageGrade);
    }
}
