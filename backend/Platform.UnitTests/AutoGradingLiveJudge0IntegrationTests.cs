using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Submissions.Dtos;
using Platform.Application.Services;
using Platform.Application.Services.Grading;
using Platform.Domain.Entities;
using Platform.Domain.Enums;
using Platform.Infrastructure.Persistence;
using Platform.Infrastructure.Services;
using Xunit;

namespace Platform.UnitTests;

/// <summary>
/// Drives SubmissionService.SubmitCodeAsync exactly the way the "Submit" button in TaskWorkspace
/// does, but against the real public Judge0 instance (ce.judge0.com) instead of a mock -- the same
/// engine wired up in appsettings.json. This is the closest thing to an end-to-end proof that
/// "student runs code, gets auto-graded" actually works without needing a browser + real login.
/// Requires outbound network access; skip locally if offline.
/// </summary>
public class AutoGradingLiveJudge0IntegrationTests
{
    private static DbContextOptions<ApplicationDbContext> MakeOptions(string dbName) =>
        new DbContextOptionsBuilder<ApplicationDbContext>().UseInMemoryDatabase(dbName).Options;

    private static SubmissionService BuildService(ApplicationDbContext context)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?> { ["Judge0:BaseUrl"] = "https://ce.judge0.com" })
            .Build();

        var executionService = new Judge0ExecutionService(new HttpClient(), config, NullLogger<Judge0ExecutionService>.Instance);
        var languageRegistry = new LanguageRegistry();
        var dispatcher = new GradingEngineDispatcher(new IGradingModule[]
        {
            new ManualReviewModule(executionService, languageRegistry),
            new Judge0AutoGradingModule(executionService, languageRegistry),
        });

        return new SubmissionService(
            context,
            executionService,
            languageRegistry,
            dispatcher,
            NullLogger<SubmissionService>.Instance,
            Mock.Of<IActivityLogger>(),
            Mock.Of<IEmailService>());
    }

    [Fact]
    public async Task SubmittingCorrectCode_AgainstAutomaticGradingTask_IsGradedFullMarksAndTakenOffTheReviewQueue()
    {
        var dbName = Guid.NewGuid().ToString();

        var teacher = new User { Id = Guid.NewGuid(), Name = "Teacher", Email = "teacher@test.com", Role = UserRole.Teacher, PasswordHash = "hash" };
        var student = new User { Id = Guid.NewGuid(), Name = "Student", Email = "student@test.com", Role = UserRole.Student, PasswordHash = "hash" };
        var course = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacher.Id, Teacher = teacher, IsArchived = false };
        var session = new Session { Id = Guid.NewGuid(), CourseId = course.Id, Course = course, Title = "Week 1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Print Hello",
            Language = "python",
            MaxGrade = 100,
            EvaluationMode = EvaluationMode.AutomaticGrading,
            RunHiddenTestCases = false,
            PublicTestCasesJson = "[{\"input\":\"\",\"expectedOutput\":\"hello\"}]",
            HiddenTestCasesJson = "[]",
            Deadline = DateTime.UtcNow.AddDays(7),
        };

        using (var seedContext = new ApplicationDbContext(MakeOptions(dbName)))
        {
            seedContext.Users.AddRange(teacher, student);
            seedContext.Courses.Add(course);
            seedContext.Sessions.Add(session);
            seedContext.ProgrammingTasks.Add(task);
            seedContext.Enrollments.Add(new Enrollment { StudentId = student.Id, Student = student, CourseId = course.Id, Course = course });
            await seedContext.SaveChangesAsync();
        }

        using var context = new ApplicationDbContext(MakeOptions(dbName));
        var service = BuildService(context);

        var result = await service.SubmitCodeAsync(student.Id, task.Id, new SubmitCodeDto { Code = "print('hello')" });

        Assert.Equal(100, result.Grade);

        using var verifyContext = new ApplicationDbContext(MakeOptions(dbName));
        var stored = Assert.Single(verifyContext.Submissions);
        Assert.Equal(SubmissionStatus.Graded, stored.Status);
        Assert.True(stored.IsReviewed);
        Assert.Equal(100, stored.Grade);
        Assert.Equal(1, stored.PassedPublicCases);
        Assert.Equal(1, stored.TotalPublicCases);
    }
}
