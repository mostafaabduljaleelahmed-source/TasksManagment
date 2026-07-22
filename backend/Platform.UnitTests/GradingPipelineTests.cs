using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Submissions.Dtos;
using Platform.Application.Services;
using Platform.Application.Services.Grading;
using Platform.Domain.Entities;
using Platform.Domain.Enums;
using Platform.Infrastructure.Persistence;
using Xunit;

namespace Platform.UnitTests;

public class GradingPipelineTests
{
    private async Task<ApplicationDbContext> GetDatabaseContextAsync()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new ApplicationDbContext(options);
        await context.Database.EnsureCreatedAsync();
        return context;
    }

    private IGradingEngineDispatcher GetGradingDispatcher(IExecutionService executionService)
    {
        var langRegistry = new LanguageRegistry();
        var manualModule = new ManualReviewModule();
        var autoModule = new Judge0AutoGradingModule(executionService, langRegistry);
        return new GradingEngineDispatcher(new IGradingModule[] { manualModule, autoModule });
    }

    [Fact]
    public async Task Test_SubmitCode_ManualReviewMode_SavesSubmission_PendingTeacherReview()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var session = new Session { Id = Guid.NewGuid(), Title = "S1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Print Hello",
            MaxGrade = 100,
            Mode = ProgrammingTaskMode.InClass,
            EvaluationMode = EvaluationMode.ManualReview
        };
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        await context.SaveChangesAsync();

        var mockRunner = new Mock<ICodeExecutionService>();
        var mockExec = new Mock<IExecutionService>();
        var dispatcher = GetGradingDispatcher(mockExec.Object);

        var service = new SubmissionService(context, mockRunner.Object, dispatcher, NullLogger<SubmissionService>.Instance);

        // Act
        var result = await service.SubmitCodeAsync(Guid.NewGuid(), task.Id, new SubmitCodeDto { Code = "print('Hello World')" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.AttemptNumber);
        Assert.Equal("print('Hello World')", result.Code);
        Assert.Equal(0, result.Grade);
        Assert.Equal("PendingEvaluation", result.ExecutionStatus);
    }

    [Fact]
    public async Task Test_SubmitCode_AutomaticGradingMode_EvaluatesWithJudge0Engine()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var session = new Session { Id = Guid.NewGuid(), Title = "S1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Auto Graded Math",
            MaxGrade = 100,
            Mode = ProgrammingTaskMode.InClass,
            EvaluationMode = EvaluationMode.AutomaticGrading,
            Language = "python",
            PublicTestCasesJson = "[{\"Input\":\"5\",\"Output\":\"10\"}]"
        };
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        await context.SaveChangesAsync();

        var mockRunner = new Mock<ICodeExecutionService>();
        var mockExec = new Mock<IExecutionService>();
        mockExec.Setup(e => e.ExecuteAsync(It.IsAny<Judge0ExecutionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Judge0ExecutionResult
            {
                StatusId = 3,
                StatusDescription = "Accepted",
                Stdout = "10\n",
                Passed = true,
                TimeSeconds = 0.04
            });

        var dispatcher = GetGradingDispatcher(mockExec.Object);
        var service = new SubmissionService(context, mockRunner.Object, dispatcher, NullLogger<SubmissionService>.Instance);

        // Act
        var result = await service.SubmitCodeAsync(Guid.NewGuid(), task.Id, new SubmitCodeDto { Code = "n = int(input()); print(n * 2)" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.Grade);
        Assert.Equal("Accepted", result.ExecutionStatus);
        Assert.Contains("Passed all", result.Feedback);
    }

    [Fact]
    public async Task Test_ReviewSubmission_UpdatesGradeAndTeacherFeedback()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var session = new Session { Id = Guid.NewGuid(), Title = "S1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Python Functions",
            MaxGrade = 100,
            Mode = ProgrammingTaskMode.InClass
        };
        var student = new User
        {
            Id = Guid.NewGuid(),
            Name = "John Doe",
            Email = "john@example.com",
            Role = UserRole.Student
        };
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        context.Users.Add(student);
        await context.SaveChangesAsync();

        var mockRunner = new Mock<ICodeExecutionService>();
        var mockExec = new Mock<IExecutionService>();
        var dispatcher = GetGradingDispatcher(mockExec.Object);
        var service = new SubmissionService(context, mockRunner.Object, dispatcher, NullLogger<SubmissionService>.Instance);

        var submission = await service.SubmitCodeAsync(student.Id, task.Id, new SubmitCodeDto { Code = "def add(a, b):\n    return a + b" });

        // Act - Teacher reviews & grades submission
        var reviewDto = new ReviewSubmissionDto
        {
            Grade = 95,
            TeacherFeedback = "Great code organization and implementation!",
            TeacherNotes = "First class submission"
        };
        var updated = await service.ReviewSubmissionAsync(submission.Id, reviewDto);

        // Assert
        Assert.Equal(95, updated.Grade);
        Assert.Equal("Great code organization and implementation!", updated.TeacherFeedback);
        Assert.Equal("First class submission", updated.TeacherNotes);
    }

    [Fact]
    public async Task Test_EmptySubmission_ThrowsInvalidOperationException()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var session = new Session { Id = Guid.NewGuid(), Title = "S1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Empty Submission Task",
            MaxGrade = 100,
            Mode = ProgrammingTaskMode.InClass
        };
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        await context.SaveChangesAsync();

        var mockRunner = new Mock<ICodeExecutionService>();
        var mockExec = new Mock<IExecutionService>();
        var dispatcher = GetGradingDispatcher(mockExec.Object);
        var service = new SubmissionService(context, mockRunner.Object, dispatcher, NullLogger<SubmissionService>.Instance);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitCodeAsync(Guid.NewGuid(), task.Id, new SubmitCodeDto { Code = "   " }));

        Assert.Contains("Submission code cannot be empty", ex.Message);
    }
}
