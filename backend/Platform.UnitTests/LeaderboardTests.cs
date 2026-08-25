using System;
using System.Collections.Generic;
using System.Linq;
using Platform.Application.Services;
using Platform.Domain.Entities;
using Platform.Domain.Enums;
using Xunit;

namespace Platform.UnitTests;

public class LeaderboardTests
{
    private static (Course course, Session session, ProgrammingTask task40, ProgrammingTask task60) MakeCourseWithTwoTasks(User teacher)
    {
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var task40 = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task A", MaxGrade = 40, Deadline = DateTime.UtcNow.AddDays(7) };
        var task60 = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = session.Id, Session = session, Title = "Task B", MaxGrade = 60, Deadline = DateTime.UtcNow.AddDays(7) };
        session.Tasks.Add(task40);
        session.Tasks.Add(task60);
        return (course, session, task40, task60);
    }

    private static Submission MakeSubmission(ProgrammingTask task, User student, int grade)
    {
        return new Submission
        {
            Id = Guid.NewGuid(),
            TaskId = task.Id,
            Task = task,
            StudentId = student.Id,
            Student = student,
            Grade = grade,
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow,
        };
    }

    private static Enrollment Enroll(User student, Course course) =>
        new() { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course };

    [Fact]
    public void Leaderboard_RanksByTotalMarksEarned_WeightedByEachTasksPointValue()
    {
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var (course, _, task40, task60) = MakeCourseWithTwoTasks(teacher);

        // Two tasks worth 40 and 60 points -- 100 possible total for anyone enrolled in this course.
        // Alice: full marks (40/40) on the small task, nothing on the big one -> 40/100 total.
        var alice = new User { Id = Guid.NewGuid(), Name = "Alice", Email = "alice@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        // Bob: 30/60 on the big task only -> 30/100 total.
        var bob = new User { Id = Guid.NewGuid(), Name = "Bob", Email = "bob@test.com", Role = UserRole.Student, PasswordHash = "hash" };

        var enrollments = new List<Enrollment> { Enroll(alice, course), Enroll(bob, course) };
        var submissions = new List<Submission> { MakeSubmission(task40, alice, 40), MakeSubmission(task60, bob, 30) };
        var tasks = new List<ProgrammingTask> { task40, task60 };

        var result = new GradingCalculator().BuildLeaderboard(enrollments, submissions, tasks);

        Assert.Equal(2, result.Count);
        Assert.Equal("Alice", result[0].StudentName);
        Assert.Equal(40, result[0].TotalScore);
        Assert.Equal(100, result[0].TotalPossibleScore);
        Assert.Equal(40.0, result[0].AverageGrade);
        Assert.Equal("Bob", result[1].StudentName);
        Assert.Equal(30, result[1].TotalScore);
        Assert.Equal(30.0, result[1].AverageGrade);
        Assert.Equal(2, result[0].TotalTasks);
        Assert.Equal(1, result[0].CompletedTasks);
    }

    [Fact]
    public void Leaderboard_TieOnTotalMarks_BreaksTieOnCompletedTaskCount()
    {
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var (course, _, task40, task60) = MakeCourseWithTwoTasks(teacher);

        var alice = new User { Id = Guid.NewGuid(), Name = "Alice", Email = "alice@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var bob = new User { Id = Guid.NewGuid(), Name = "Bob", Email = "bob@test.com", Role = UserRole.Student, PasswordHash = "hash" };

        var enrollments = new List<Enrollment> { Enroll(alice, course), Enroll(bob, course) };
        // Both land on exactly 50/100 total marks, but Alice earned it across both assigned
        // tasks while Bob only ever attempted one of the two.
        var submissions = new List<Submission>
        {
            MakeSubmission(task40, alice, 20),
            MakeSubmission(task60, alice, 30), // Alice: 20 + 30 = 50
            MakeSubmission(task60, bob, 50),   // Bob: 50 + 0 (task40 untouched) = 50
        };
        var tasks = new List<ProgrammingTask> { task40, task60 };

        var result = new GradingCalculator().BuildLeaderboard(enrollments, submissions, tasks);

        Assert.Equal(50, result[0].TotalScore);
        Assert.Equal(50, result[1].TotalScore);
        Assert.Equal(50.0, result[0].AverageGrade);
        Assert.Equal(50.0, result[1].AverageGrade);
        Assert.Equal("Alice", result[0].StudentName);
        Assert.Equal(2, result[0].CompletedTasks);
        Assert.Equal("Bob", result[1].StudentName);
        Assert.Equal(1, result[1].CompletedTasks);
    }

    [Fact]
    public void Leaderboard_StudentWithNoTasksAssignedYet_ShowsZeroTotalsAndSortsLast()
    {
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var (course, _, task40, _) = MakeCourseWithTwoTasks(teacher);

        // A second course, same teacher, with no sessions/tasks created yet.
        var emptyCourse = new Course { Id = Guid.NewGuid(), Name = "CS102", CourseCode = "CS102", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };

        var alice = new User { Id = Guid.NewGuid(), Name = "Alice", Email = "alice@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var casey = new User { Id = Guid.NewGuid(), Name = "Casey", Email = "casey@test.com", Role = UserRole.Student, PasswordHash = "hash" };

        var enrollments = new List<Enrollment> { Enroll(alice, course), Enroll(casey, emptyCourse) };
        var submissions = new List<Submission> { MakeSubmission(task40, alice, 10) }; // 25% on her one task
        var tasks = new List<ProgrammingTask> { task40 };

        var result = new GradingCalculator().BuildLeaderboard(enrollments, submissions, tasks);

        var caseyEntry = result.Single(e => e.StudentName == "Casey");
        // Casey's own course has zero tasks: must show 0/0, never borrow Alice's course's tasks.
        Assert.Equal(0, caseyEntry.TotalTasks);
        Assert.Equal(0, caseyEntry.CompletedTasks);
        Assert.Equal(0.0, caseyEntry.AverageGrade);
        // Alice (a real, if low, score) still outranks a student with nothing assigned at all.
        Assert.Equal("Alice", result[0].StudentName);
    }

    [Fact]
    public void Leaderboard_ScopesTasksToTheStudentsOwnCourse_NeverLeaksAcrossCourses()
    {
        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var (courseX, _, taskX40, taskX60) = MakeCourseWithTwoTasks(teacher);

        var courseY = new Course { Id = Guid.NewGuid(), Name = "CS200", CourseCode = "CS200", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var sessionY = new Session { Id = Guid.NewGuid(), CourseId = courseY.Id, Course = courseY, Title = "Week 1", IsUnlocked = true };
        var taskY = new ProgrammingTask { Id = Guid.NewGuid(), SessionId = sessionY.Id, Session = sessionY, Title = "Task Y", MaxGrade = 100, Deadline = DateTime.UtcNow.AddDays(7) };
        sessionY.Tasks.Add(taskY);

        var studentInX = new User { Id = Guid.NewGuid(), Name = "InCourseX", Email = "x@test.com", Role = UserRole.Student, PasswordHash = "hash" };

        var enrollments = new List<Enrollment> { Enroll(studentInX, courseX) };
        var submissions = new List<Submission>();
        // Both courses' tasks are passed in (mirrors the controller pulling all assigned tasks
        // across every course in scope), but the student is only enrolled in courseX.
        var tasks = new List<ProgrammingTask> { taskX40, taskX60, taskY };

        var result = new GradingCalculator().BuildLeaderboard(enrollments, submissions, tasks);

        Assert.Single(result);
        Assert.Equal(2, result[0].TotalTasks); // only courseX's two tasks, never courseY's
    }
}
