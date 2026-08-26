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
            var (totalScore, totalPossible) = CalculateLeaderboardTotals(studentTasks, studentSubs);

            entries.Add(new LeaderboardEntryDto
            {
                StudentId = student.Id,
                StudentName = student.Name,
                StudentEmail = student.Email,
                AvatarUrl = student.AvatarUrl,
                StudentRegisterId = student.StudentId ?? "-",
                AverageGrade = totalPossible > 0 ? Math.Round(totalScore * 100.0 / totalPossible, 1) : 0.0,
                TotalScore = totalScore,
                TotalPossibleScore = totalPossible,
                CompletedTasks = completedTasks,
                TotalTasks = studentTasks.Count,
                TotalSubmissions = studentSubs.Count,
            });
        }

        var sorted = entries
            // Ranked by raw total marks earned -- the "total marks" metric this leaderboard is
            // meant to show -- not the percentage, which can disagree with it once students are
            // compared across courses with different total possible marks (the global, no-
            // courseId view). CompletedTasks/TotalTasks order same-score students within a tied
            // group (more completed work first); StudentName is the final stable tiebreaker so
            // that ordering is predictable rather than shuffling between requests.
            .OrderByDescending(e => e.TotalScore)
            .ThenByDescending(e => e.CompletedTasks)
            .ThenByDescending(e => e.TotalTasks)
            .ThenBy(e => e.StudentName, StringComparer.OrdinalIgnoreCase)
            .ToList();

        AssignCompetitionRanks(sorted);
        return sorted;
    }

    /// <summary>
    /// Competition ranking (1,2,2,4): students with an equal TotalScore share a rank, and the
    /// next distinct score skips ahead by the size of the tied group. A student with zero
    /// assigned tasks is never folded into a tied group with others at 0 -- "5 people tied for
    /// last, none of whom have started" is noise, not a real tie. Mirrors the frontend's
    /// leaderboardRanking.ts exactly so client and server never disagree about who's tied with whom.
    /// </summary>
    private static void AssignCompetitionRanks(List<LeaderboardEntryDto> sorted)
    {
        var i = 0;
        while (i < sorted.Count)
        {
            if (sorted[i].TotalTasks == 0)
            {
                sorted[i].Rank = i + 1;
                sorted[i].TiedCount = 0;
                i += 1;
                continue;
            }

            var j = i;
            while (j < sorted.Count && sorted[j].TotalScore == sorted[i].TotalScore && sorted[j].TotalTasks > 0)
            {
                j += 1;
            }
            var rank = i + 1;
            var groupSize = j - i;
            for (var k = i; k < j; k++)
            {
                sorted[k].Rank = rank;
                sorted[k].TiedCount = groupSize - 1;
            }
            i = j;
        }
    }

    /// <summary>
    /// Leaderboard totals: literal sum of earned points and sum of possible points across every
    /// assigned task (not an average of per-task percentages). This is what "total marks" means --
    /// a task worth 60 points should move the ranking more than a task worth 5, which an average-
    /// of-percentages would flatten. An unattempted or ungraded task contributes 0 earned points
    /// but its max grade still counts toward the possible total, so skipping work still costs rank.
    /// </summary>
    private (int totalScore, int totalPossible) CalculateLeaderboardTotals(IEnumerable<ProgrammingTask> assignedTasks, IEnumerable<Submission> studentSubmissions)
    {
        var taskList = assignedTasks?.ToList() ?? new List<ProgrammingTask>();
        if (taskList.Count == 0) return (0, 0);

        var subs = studentSubmissions?.ToList() ?? new List<Submission>();

        int totalScore = 0;
        int totalPossible = 0;
        foreach (var task in taskList)
        {
            var bestSub = GetHighestGradedSubmission(subs.Where(s => s.TaskId == task.Id));
            totalScore += bestSub?.Grade ?? 0;
            totalPossible += task.MaxGrade;
        }

        return (totalScore, totalPossible);
    }
}
