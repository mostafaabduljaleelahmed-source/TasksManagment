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
        var manualModule = new ManualReviewModule(executionService, langRegistry);
        var autoModule = new Judge0AutoGradingModule(executionService, langRegistry);
        return new GradingEngineDispatcher(new IGradingModule[] { manualModule, autoModule });
    }

    [Fact]
    public async Task Test_SubmitCode_ManualReviewMode_SavesSubmission_PendingTeacherReview()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var studentId = Guid.NewGuid();
        var student = new User { Id = studentId, Name = "Student 1", Role = UserRole.Student };
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
        context.Users.Add(student);
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        await context.SaveChangesAsync();

        var mockExec = new Mock<IExecutionService>();
        mockExec.Setup(e => e.ExecuteAsync(It.IsAny<Judge0ExecutionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Judge0ExecutionResult { StatusId = 3, StatusDescription = "Accepted", TimeSeconds = 0.01 });

        var mockActivityLogger = new Mock<IActivityLogger>();
        var mockEmail = new Mock<IEmailService>();
        var langRegistry = new LanguageRegistry();

        var dispatcher = GetGradingDispatcher(mockExec.Object);
        var service = new SubmissionService(context, mockExec.Object, langRegistry, dispatcher, NullLogger<SubmissionService>.Instance, mockActivityLogger.Object, mockEmail.Object);

        // Act
        var result = await service.SubmitCodeAsync(studentId, task.Id, new SubmitCodeDto { Code = "print('Hello World')" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.AttemptNumber);
        Assert.Equal("print('Hello World')", result.Code);
        Assert.Equal(0, result.Grade);
        Assert.Equal("PendingEvaluation", result.ExecutionStatus);
    }

    [Fact]
    public async Task Test_SubmitCode_AutomaticGrading_Judge0AllPassed_CalculatesFullGrade()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var studentId = Guid.NewGuid();
        var student = new User { Id = studentId, Name = "Student 1", Role = UserRole.Student };
        var session = new Session { Id = Guid.NewGuid(), Title = "S1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Sum Two Numbers",
            MaxGrade = 100,
            Language = "python",
            Mode = ProgrammingTaskMode.InClass,
            EvaluationMode = EvaluationMode.AutomaticGrading,
            PublicTestCasesJson = "[{\"Input\":\"1 2\",\"Output\":\"3\"}]"
        };
        context.Users.Add(student);
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        await context.SaveChangesAsync();

        var mockExec = new Mock<IExecutionService>();
        mockExec.Setup(e => e.ExecuteAsync(It.IsAny<Judge0ExecutionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Judge0ExecutionResult
            {
                StatusId = 3,
                StatusDescription = "Accepted",
                Stdout = "3\n",
                TimeSeconds = 0.02,
                MemoryKb = 1000,
                Passed = true
            });

        var mockActivityLogger = new Mock<IActivityLogger>();
        var mockEmail = new Mock<IEmailService>();
        var langRegistry = new LanguageRegistry();

        var dispatcher = GetGradingDispatcher(mockExec.Object);
        var service = new SubmissionService(context, mockExec.Object, langRegistry, dispatcher, NullLogger<SubmissionService>.Instance, mockActivityLogger.Object, mockEmail.Object);

        // Act
        var result = await service.SubmitCodeAsync(studentId, task.Id, new SubmitCodeDto { Code = "print(1+2)" });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.Grade);
        Assert.Equal("Accepted", result.ExecutionStatus);
    }

    [Fact]
    public async Task Test_SubmitCode_AutomaticGrading_Judge0Unavailable_ThrowsException()
    {
        // Arrange
        using var context = await GetDatabaseContextAsync();
        var studentId = Guid.NewGuid();
        var student = new User { Id = studentId, Name = "Student 1", Role = UserRole.Student };
        var session = new Session { Id = Guid.NewGuid(), Title = "S1", IsUnlocked = true };
        var task = new ProgrammingTask
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Session = session,
            Title = "Test Task",
            MaxGrade = 100,
            Language = "python",
            Mode = ProgrammingTaskMode.InClass,
            EvaluationMode = EvaluationMode.AutomaticGrading,
            PublicTestCasesJson = "[{\"Input\":\"1\",\"Output\":\"1\"}]"
        };
        context.Users.Add(student);
        context.Sessions.Add(session);
        context.ProgrammingTasks.Add(task);
        await context.SaveChangesAsync();

        var mockExec = new Mock<IExecutionService>();
        mockExec.Setup(e => e.ExecuteAsync(It.IsAny<Judge0ExecutionRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Judge0ExecutionResult
            {
                IsServiceUnavailable = true,
                StatusDescription = "Automatic grading service is unavailable."
            });

        var mockActivityLogger = new Mock<IActivityLogger>();
        var mockEmail = new Mock<IEmailService>();
        var langRegistry = new LanguageRegistry();

        var dispatcher = GetGradingDispatcher(mockExec.Object);
        var service = new SubmissionService(context, mockExec.Object, langRegistry, dispatcher, NullLogger<SubmissionService>.Instance, mockActivityLogger.Object, mockEmail.Object);

        // Act & Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            service.SubmitCodeAsync(studentId, task.Id, new SubmitCodeDto { Code = "print(1)" })
        );

        Assert.Equal("Automatic grading service is unavailable.", ex.Message);
    }
}
