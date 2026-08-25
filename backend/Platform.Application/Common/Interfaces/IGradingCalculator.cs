using System;
using System.Collections.Generic;
using Platform.Application.Features.Dashboard.Dtos;
using Platform.Domain.Entities;

namespace Platform.Application.Common.Interfaces;

public interface IGradingCalculator
{
    /// <summary>
    /// Returns the student's highest graded attempt for a specific task.
    /// Pending, unreviewed, or cancelled attempts are strictly excluded.
    /// </summary>
    Submission? GetHighestGradedSubmission(IEnumerable<Submission> studentTaskSubmissions);

    /// <summary>
    /// Gets the numerical grade for a student's task using their highest graded submission.
    /// Returns null if no reviewed/graded submission exists.
    /// </summary>
    int? GetHighestTaskGrade(IEnumerable<Submission> studentTaskSubmissions);

    /// <summary>
    /// Calculates a student's overall average grade percentage across all assigned tasks.
    /// Uses highest graded attempt per task. Tasks with no graded attempts are excluded from denominator or handled cleanly.
    /// </summary>
    double CalculateStudentAverageGrade(IEnumerable<ProgrammingTask> assignedTasks, IEnumerable<Submission> studentSubmissions);

    /// <summary>
    /// Gets the list of pending submissions that require manual teacher review.
    /// Strictly filters by Status == SubmissionStatus.Pending && !IsReviewed.
    /// </summary>
    IEnumerable<Submission> GetPendingReviews(IEnumerable<Submission> submissions);

    /// <summary>
    /// Builds a ranked leaderboard: one entry per distinct student found in <paramref name="enrollments"/>,
    /// scoped to only the tasks assigned in that student's own enrolled course(s) (never borrowed from
    /// courses the student isn't in). Ranked by average grade percentage descending, then by completed
    /// task count descending (rewards students who've done more graded work on a tied average), then by
    /// total assigned tasks descending as a final stable tiebreaker. A student with zero assigned tasks
    /// gets a 0% / 0-of-0 entry rather than being excluded or crashing.
    /// </summary>
    List<LeaderboardEntryDto> BuildLeaderboard(
        IEnumerable<Enrollment> enrollments,
        IEnumerable<Submission> allSubmissions,
        IEnumerable<ProgrammingTask> assignedTasks);
}
