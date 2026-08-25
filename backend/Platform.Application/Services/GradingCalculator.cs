using System;
using System.Collections.Generic;
using System.Linq;
using Platform.Application.Common.Interfaces;
using Platform.Application.Common.Utils;
using Platform.Application.Features.Dashboard.Dtos;
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

    public List<LeaderboardEntryDto> BuildLeaderboard(
        IEnumerable<Enrollment> enrollments,
        IEnumerable<Submission> allSubmissions,
        IEnumerable<ProgrammingTask> assignedTasks)
    {
        var enrollmentList = enrollments?.ToList() ?? new List<Enrollment>();
        var submissionList = allSubmissions?.ToList() ?? new List<Submission>();
        var taskList = assignedTasks?.ToList() ?? new List<ProgrammingTask>();

        var entries = new List<LeaderboardEntryDto>();

        foreach (var studentId in enrollmentList.Select(e => e.StudentId).Distinct())
        {
            var student = enrollmentList.First(e => e.StudentId == studentId).Student;
            if (student == null) continue;

            var studentSubs = submissionList.Where(s => s.StudentId == studentId).ToList();

            // Only count tasks from courses this student is actually enrolled in -- never
            // fall back to tasks from unrelated courses just because this student's own
            // course has none assigned yet.
            var studentCourseIds = enrollmentList.Where(e => e.StudentId == studentId).Select(e => e.CourseId).ToHashSet();
            var studentTasks = taskList.Where(t => t.Session != null && studentCourseIds.Contains(t.Session.CourseId)).ToList();

            var completedTasks = studentTasks.Count(t => GetHighestGradedSubmission(studentSubs.Where(s => s.TaskId == t.Id)) != null);

            entries.Add(new LeaderboardEntryDto
            {
                StudentId = student.Id,
                StudentName = student.Name,
                StudentEmail = student.Email,
                AvatarUrl = student.AvatarUrl,
                StudentRegisterId = student.StudentId ?? "-",
                AverageGrade = CalculateLeaderboardAverage(studentTasks, studentSubs),
                CompletedTasks = completedTasks,
                TotalTasks = studentTasks.Count,
                TotalSubmissions = studentSubs.Count,
            });
        }

        return entries
            .OrderByDescending(e => e.AverageGrade)
            .ThenByDescending(e => e.CompletedTasks)
            .ThenByDescending(e => e.TotalTasks)
            .ToList();
    }

    /// <summary>
    /// Leaderboard-specific average: divides by every assigned task, not just the ones the
    /// student attempted. Unlike <see cref="CalculateStudentAverageGrade"/> (which averages only
    /// over attempted tasks -- appropriate for a student's own profile, "how am I doing on what
    /// I've submitted"), a competitive ranking must not let a student who did 1 of 20 tasks
    /// perfectly outrank one who did 18 of 20 well: every assigned task counts toward the
    /// denominator, and an unattempted or ungraded task contributes 0%.
    /// </summary>
    private double CalculateLeaderboardAverage(IEnumerable<ProgrammingTask> assignedTasks, IEnumerable<Submission> studentSubmissions)
    {
        var taskList = assignedTasks?.ToList() ?? new List<ProgrammingTask>();
        if (taskList.Count == 0) return 0.0;

        var subs = studentSubmissions?.ToList() ?? new List<Submission>();

        double total = 0.0;
        foreach (var task in taskList)
        {
            var bestSub = GetHighestGradedSubmission(subs.Where(s => s.TaskId == task.Id));
            total += bestSub != null ? GradeCalculator.CalculatePercentage(bestSub.Grade, task.MaxGrade) : 0.0;
        }

        return Math.Round(total / taskList.Count, 1);
    }
}
