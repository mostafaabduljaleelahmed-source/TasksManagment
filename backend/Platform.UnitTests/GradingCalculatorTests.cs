using System;
using System.Collections.Generic;
using Platform.Application.Services;
using Platform.Domain.Entities;
using Platform.Domain.Enums;
using Xunit;

namespace Platform.UnitTests;

public class GradingCalculatorTests
{
    private readonly GradingCalculator _calculator = new();

    [Fact]
    public void GetHighestGradedSubmission_ReturnsHighestGradedAttemptOnly()
    {
        // Scenario:
        // Attempt 1: Graded = 40
        // Attempt 2: Pending (Grade = 0, Status = Pending, IsReviewed = false)
        var studentId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        var sub1 = new Submission
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TaskId = taskId,
            Grade = 40,
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow.AddHours(-2)
        };

        var sub2 = new Submission
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TaskId = taskId,
            Grade = 0,
            Status = SubmissionStatus.Pending,
            IsReviewed = false,
            SubmittedAt = DateTime.UtcNow
        };

        var subs = new List<Submission> { sub1, sub2 };

        var result = _calculator.GetHighestGradedSubmission(subs);

        Assert.NotNull(result);
        Assert.Equal(40, result.Grade);
        Assert.Equal(sub1.Id, result.Id);
    }

    [Fact]
    public void GetHighestGradedSubmission_WhenNewAttemptIsGradedHigher_ReturnsNewScore()
    {
        // Scenario:
        // Attempt 1: Graded = 40
        // Attempt 2: Graded = 80
        var studentId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        var sub1 = new Submission
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TaskId = taskId,
            Grade = 40,
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow.AddHours(-2)
        };

        var sub2 = new Submission
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TaskId = taskId,
            Grade = 80,
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow
        };

        var subs = new List<Submission> { sub1, sub2 };

        var result = _calculator.GetHighestGradedSubmission(subs);

        Assert.NotNull(result);
        Assert.Equal(80, result.Grade);
        Assert.Equal(sub2.Id, result.Id);
    }

    [Fact]
    public void GetHighestGradedSubmission_WhenNewAttemptIsGradedLower_RetainsHigherScore()
    {
        // Scenario:
        // Attempt 1: Graded = 40
        // Attempt 2: Graded = 20
        var studentId = Guid.NewGuid();
        var taskId = Guid.NewGuid();

        var sub1 = new Submission
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TaskId = taskId,
            Grade = 40,
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow.AddHours(-2)
        };

        var sub2 = new Submission
        {
            Id = Guid.NewGuid(),
            StudentId = studentId,
            TaskId = taskId,
            Grade = 20,
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow
        };

        var subs = new List<Submission> { sub1, sub2 };

        var result = _calculator.GetHighestGradedSubmission(subs);

        Assert.NotNull(result);
        Assert.Equal(40, result.Grade);
        Assert.Equal(sub1.Id, result.Id);
    }

    [Fact]
    public void GetPendingReviews_WhenSubmissionGradedWithZeroPoints_ExcludesFromPendingList()
    {
        // Critical Fix Scenario:
        // Teacher grades submission with 0 points and no feedback.
        // Status is set to Graded, IsReviewed = true.
        var subGradedZero = new Submission
        {
            Id = Guid.NewGuid(),
            Grade = 0,
            TeacherFeedback = "",
            Status = SubmissionStatus.Graded,
            IsReviewed = true,
            SubmittedAt = DateTime.UtcNow
        };

        var subPending = new Submission
        {
            Id = Guid.NewGuid(),
            Grade = 0,
            TeacherFeedback = "",
            Status = SubmissionStatus.Pending,
            IsReviewed = false,
            SubmittedAt = DateTime.UtcNow
        };

        var subs = new List<Submission> { subGradedZero, subPending };

        var pendingList = _calculator.GetPendingReviews(subs);

        Assert.Single(pendingList);
        Assert.Equal(subPending.Id, pendingList.First().Id);
    }
}
