using System;
using System.Collections.Generic;
using System.Linq;
using Platform.Application.Common.Interfaces;
using Platform.Application.Common.Utils;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Application.Services;

public class GradingCalculator : IGradingCalculator
{
    public Submission? GetHighestGradedSubmission(IEnumerable<Submission> studentTaskSubmissions)
    {
        if (studentTaskSubmissions == null) return null;

        // Strictly filter to reviewed/graded attempts
        return studentTaskSubmissions
            .Where(s => s.IsReviewed || s.Status == SubmissionStatus.Graded || s.Status == SubmissionStatus.Returned || s.Status == SubmissionStatus.Late)
            .OrderByDescending(s => s.Grade)
            .ThenByDescending(s => s.SubmittedAt)
            .FirstOrDefault();
    }

    public int? GetHighestTaskGrade(IEnumerable<Submission> studentTaskSubmissions)
    {
        var best = GetHighestGradedSubmission(studentTaskSubmissions);
        return best?.Grade;
    }

    public double CalculateStudentAverageGrade(IEnumerable<ProgrammingTask> assignedTasks, IEnumerable<Submission> studentSubmissions)
    {
        if (assignedTasks == null || !assignedTasks.Any() || studentSubmissions == null)
            return 0.0;

        var percentages = new List<double>();

        foreach (var task in assignedTasks)
        {
            var taskSubs = studentSubmissions.Where(s => s.TaskId == task.Id);
            var bestSub = GetHighestGradedSubmission(taskSubs);

            if (bestSub != null)
            {
                var pct = GradeCalculator.CalculatePercentage(bestSub.Grade, task.MaxGrade);
                percentages.Add(pct);
            }
        }

        return percentages.Any() ? Math.Round(percentages.Average(), 1) : 0.0;
    }

    public IEnumerable<Submission> GetPendingReviews(IEnumerable<Submission> submissions)
    {
        if (submissions == null) return Enumerable.Empty<Submission>();

        // Group by StudentId & TaskId, get latest submission per group
        return submissions
            .GroupBy(s => new { s.StudentId, s.TaskId })
            .Select(g => g.OrderByDescending(s => s.SubmittedAt).ThenByDescending(s => s.AttemptNumber).First())
            .Where(latest => latest.Status == SubmissionStatus.Pending && !latest.IsReviewed)
            .OrderByDescending(s => s.SubmittedAt);
    }
}
