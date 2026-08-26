using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Platform.Api.Controllers;
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

    [Fact]
    public async Task GetLeaderboard_PeriodFilter_OnlyCountsSubmissionsWithinTheWindow()
    {
        // Goes through the real DashboardController.GetLeaderboard endpoint (not a re-implemented
        // query) since the period filter lives there.
        var dbName = Guid.NewGuid().ToString();

        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Nadia", Email = "nadia@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var oldTask = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Old Task", MaxGrade = 50, Deadline = DateTime.UtcNow.AddDays(-40) };
        var recentTask = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Recent Task", MaxGrade = 50, Deadline = DateTime.UtcNow.AddDays(7) };

        using (var seedContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            seedContext.Users.AddRange(teacher, student);
            seedContext.Courses.Add(course);
            seedContext.Sessions.Add(session);
            seedContext.ProgrammingTasks.AddRange(oldTask, recentTask);
            seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
            seedContext.Submissions.Add(new Submission
            {
                Id = Guid.NewGuid(), TaskId = oldTask.Id, Task = oldTask, StudentId = student.Id, Student = student,
                Grade = 50, Status = SubmissionStatus.Graded, IsReviewed = true, AttemptNumber = 1,
                SubmittedAt = DateTime.UtcNow.AddDays(-20), // outside the 7-day window, inside the 30-day one
            });
            seedContext.Submissions.Add(new Submission
            {
                Id = Guid.NewGuid(), TaskId = recentTask.Id, Task = recentTask, StudentId = student.Id, Student = student,
                Grade = 40, Status = SubmissionStatus.Graded, IsReviewed = true, AttemptNumber = 1,
                SubmittedAt = DateTime.UtcNow.AddDays(-1), // inside every window
            });
            await seedContext.SaveChangesAsync();
        }

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var controller = new DashboardController(context, new GradingCalculator());

        async Task<LeaderboardEntryDto> Fetch(string? period)
        {
            var result = await controller.GetLeaderboard(course.Id, period, default);
            var ok = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
            var list = Assert.IsAssignableFrom<System.Collections.Generic.IEnumerable<LeaderboardEntryDto>>(ok.Value);
            return list.Single();
        }

        var week = await Fetch("week");
        Assert.Equal(40, week.TotalScore); // only the recent task's 40 counts
        Assert.Equal(100, week.TotalPossibleScore); // denominator stays the full assigned set

        var month = await Fetch("month");
        Assert.Equal(90, month.TotalScore); // both submissions fall inside 30 days

        var all = await Fetch(null);
        Assert.Equal(90, all.TotalScore);
    }

    [Fact]
    public async Task GetLeaderboard_FirstView_HasNoPreviousRank_AndPersistsAcheckpoint()
    {
        var dbName = Guid.NewGuid().ToString();
        var (course, student) = await SeedSingleGradedStudentAsync(dbName, grade: 80);

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var controller = new DashboardController(context, new GradingCalculator());

        var result = await controller.GetLeaderboard(course.Id, null, default);
        var entry = SingleEntry(result);

        Assert.Null(entry.PreviousRank);
        Assert.Equal(1, entry.Rank);

        var stored = await context.LeaderboardRankCheckpoints.SingleAsync(c => c.StudentId == student.Id && c.CourseId == course.Id);
        Assert.Equal(1, stored.Rank);
        Assert.Equal(80, stored.Score);
    }

    [Fact]
    public async Task GetLeaderboard_ViewedAgainWithinADay_ReportsPreviousRank_ButDoesNotOverwriteTheCheckpointYet()
    {
        var dbName = Guid.NewGuid().ToString();
        var (course, student) = await SeedSingleGradedStudentAsync(dbName, grade: 80);

        // First view creates the checkpoint (rank 1, score 80).
        using (var firstContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            await new DashboardController(firstContext, new GradingCalculator()).GetLeaderboard(course.Id, null, default);
        }

        // A teacher regrades the submission up before the 24h window elapses.
        using (var regradeContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            var submission = await regradeContext.Submissions.SingleAsync(s => s.StudentId == student.Id);
            submission.Grade = 95;
            await regradeContext.SaveChangesAsync();
        }

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var controller = new DashboardController(context, new GradingCalculator());
        var entry = SingleEntry(await controller.GetLeaderboard(course.Id, null, default));

        // PreviousRank reflects the checkpoint (still rank 1 -- only one student exists, so the
        // rank number didn't move even though the score did); the checkpoint itself is untouched
        // because less than 24h has passed.
        Assert.Equal(1, entry.PreviousRank);
        var stored = await context.LeaderboardRankCheckpoints.SingleAsync(c => c.StudentId == student.Id && c.CourseId == course.Id);
        Assert.Equal(80, stored.Score); // still the original checkpoint value, not yet refreshed
    }

    [Fact]
    public async Task GetLeaderboard_ViewedAfterADay_RefreshesTheCheckpoint_AndReportsTheOldRankAsPrevious()
    {
        var dbName = Guid.NewGuid().ToString();
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Rami", Email = "rami@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var task = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task A", MaxGrade = 100, Deadline = DateTime.UtcNow.AddDays(7) };

        using (var seedContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            seedContext.Users.AddRange(teacher, student);
            seedContext.Courses.Add(course);
            seedContext.Sessions.Add(session);
            seedContext.ProgrammingTasks.Add(task);
            seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
            seedContext.Submissions.Add(new Submission
            {
                Id = Guid.NewGuid(), TaskId = task.Id, Task = task, StudentId = student.Id, Student = student,
                Grade = 30, Status = SubmissionStatus.Graded, IsReviewed = true, AttemptNumber = 1, SubmittedAt = DateTime.UtcNow,
            });
            // Simulate a checkpoint taken more than 24h ago, back when this student ranked 5th.
            seedContext.LeaderboardRankCheckpoints.Add(new LeaderboardRankCheckpoint
            {
                Id = Guid.NewGuid(), StudentId = student.Id, CourseId = course.Id,
                Rank = 5, Score = 30, RecordedAt = DateTime.UtcNow.AddHours(-30),
            });
            await seedContext.SaveChangesAsync();
        }

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var controller = new DashboardController(context, new GradingCalculator());
        var entry = SingleEntry(await controller.GetLeaderboard(course.Id, null, default));

        // Only one student, so current rank is 1 -- old checkpoint said 5, so this reads as a
        // genuine climb from rank 5 to rank 1.
        Assert.Equal(1, entry.Rank);
        Assert.Equal(5, entry.PreviousRank);

        var stored = await context.LeaderboardRankCheckpoints.SingleAsync(c => c.StudentId == student.Id && c.CourseId == course.Id);
        Assert.Equal(1, stored.Rank); // refreshed to the current rank
        Assert.True(stored.RecordedAt > DateTime.UtcNow.AddMinutes(-1)); // refreshed just now
    }

    [Fact]
    public async Task GetLeaderboard_PeriodFilteredView_NeverReadsOrWritesCheckpoints()
    {
        var dbName = Guid.NewGuid().ToString();
        var (course, student) = await SeedSingleGradedStudentAsync(dbName, grade: 80);

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var controller = new DashboardController(context, new GradingCalculator());
        var entry = SingleEntry(await controller.GetLeaderboard(course.Id, "week", default));

        Assert.Null(entry.PreviousRank);
        Assert.False(await context.LeaderboardRankCheckpoints.AnyAsync(c => c.StudentId == student.Id));
    }

    [Fact]
    public async Task GetLeaderboard_CheckspointsAreScopedPerCourse_GlobalAndCourseViewDoNotShareOne()
    {
        var dbName = Guid.NewGuid().ToString();
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Huda", Email = "huda@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var task = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task A", MaxGrade = 100, Deadline = DateTime.UtcNow.AddDays(7) };

        using (var seedContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            seedContext.Users.AddRange(teacher, student);
            seedContext.Courses.Add(course);
            seedContext.Sessions.Add(session);
            seedContext.ProgrammingTasks.Add(task);
            seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
            seedContext.Submissions.Add(new Submission
            {
                Id = Guid.NewGuid(), TaskId = task.Id, Task = task, StudentId = student.Id, Student = student,
                Grade = 50, Status = SubmissionStatus.Graded, IsReviewed = true, AttemptNumber = 1, SubmittedAt = DateTime.UtcNow,
            });
            await seedContext.SaveChangesAsync();
        }

        using (var courseViewContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            await new DashboardController(courseViewContext, new GradingCalculator()).GetLeaderboard(course.Id, null, default);
        }
        using (var globalViewContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            await new DashboardController(globalViewContext, new GradingCalculator()).GetLeaderboard(null, null, default);
        }

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var courseCheckpoint = await context.LeaderboardRankCheckpoints.SingleAsync(c => c.StudentId == student.Id && c.CourseId == course.Id);
        var globalCheckpoint = await context.LeaderboardRankCheckpoints.SingleAsync(c => c.StudentId == student.Id && c.CourseId == null);
        Assert.NotEqual(courseCheckpoint.Id, globalCheckpoint.Id);
    }

    private static async Task<(Course course, User student)> SeedSingleGradedStudentAsync(string dbName, int grade)
    {
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Sami", Email = "sami@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var task = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task A", MaxGrade = 100, Deadline = DateTime.UtcNow.AddDays(7) };

        using var seedContext = new ApplicationDbContext(MakeOptions(dbName));
        seedContext.Users.AddRange(teacher, student);
        seedContext.Courses.Add(course);
        seedContext.Sessions.Add(session);
        seedContext.ProgrammingTasks.Add(task);
        seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
        seedContext.Submissions.Add(new Submission
        {
            Id = Guid.NewGuid(), TaskId = task.Id, Task = task, StudentId = student.Id, Student = student,
            Grade = grade, Status = SubmissionStatus.Graded, IsReviewed = true, AttemptNumber = 1, SubmittedAt = DateTime.UtcNow,
        });
        await seedContext.SaveChangesAsync();
        return (course, student);
    }

    private static LeaderboardEntryDto SingleEntry(Microsoft.AspNetCore.Mvc.IActionResult result)
    {
        var ok = Assert.IsType<Microsoft.AspNetCore.Mvc.OkObjectResult>(result);
        return Assert.IsAssignableFrom<System.Collections.Generic.IEnumerable<LeaderboardEntryDto>>(ok.Value).Single();
    }
}
