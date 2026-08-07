using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Infrastructure.Persistence;

public class DatabaseHealthReport
{
    public double OverallHealthPercentage { get; set; } = 100.0;
    public int TotalStudents { get; set; }
    public int TotalTeachers { get; set; }
    public int TotalCourses { get; set; }
    public int TotalSessions { get; set; }
    public int TotalTasks { get; set; }
    public int TotalSubmissions { get; set; }
    public int PendingReviews { get; set; }
    
    // Integrity Telemetry
    public int BrokenRecords { get; set; }
    public int DuplicateAttempts { get; set; }
    public int OrphanRecords { get; set; }
    public int InvalidGrades { get; set; }
    public int LeaderboardErrors { get; set; }
    public int RepairRequiredCount { get; set; }
    
    public List<string> AuditLogDetails { get; set; } = new();
    public DateTime AuditedAt { get; set; } = DateTime.UtcNow;
}

public class DatabaseHealthService
{
    private readonly ApplicationDbContext _context;

    public DatabaseHealthService(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DatabaseHealthReport> PerformFullAuditAsync(CancellationToken cancellationToken = default)
    {
        var report = new DatabaseHealthReport();

        // 1. Entities Telemetry Count
        report.TotalStudents = await _context.Users.CountAsync(u => u.Role == UserRole.Student, cancellationToken);
        report.TotalTeachers = await _context.Users.CountAsync(u => u.Role == UserRole.Teacher || u.Role == UserRole.Admin, cancellationToken);
        report.TotalCourses = await _context.Courses.CountAsync(cancellationToken);
        report.TotalSessions = await _context.Sessions.CountAsync(cancellationToken);
        report.TotalTasks = await _context.ProgrammingTasks.CountAsync(cancellationToken);

        var submissions = await _context.Submissions.ToListAsync(cancellationToken);
        report.TotalSubmissions = submissions.Count;

        if (!submissions.Any())
        {
            report.OverallHealthPercentage = 100.0;
            return report;
        }

        // 2. Audit Submissions
        var validTaskIds = await _context.ProgrammingTasks.Select(t => t.Id).ToListAsync(cancellationToken);
        var validStudentIds = await _context.Users.Select(u => u.Id).ToListAsync(cancellationToken);

        int brokenStateCount = 0;
        int invalidGradeCount = 0;
        int orphanCount = 0;
        int duplicateAttemptCount = 0;

        foreach (var sub in submissions)
        {
            // Orphan check
            if (!validTaskIds.Contains(sub.TaskId) || !validStudentIds.Contains(sub.StudentId))
            {
                orphanCount++;
                report.AuditLogDetails.Add($"Orphan submission found: ID {sub.Id}, TaskId {sub.TaskId}, StudentId {sub.StudentId}");
            }

            // Grade bounds check
            if (sub.Grade < 0)
            {
                invalidGradeCount++;
                report.AuditLogDetails.Add($"Invalid negative grade found: Submission ID {sub.Id}, Grade {sub.Grade}");
            }

            // Review status inconsistency check
            if (sub.IsReviewed && sub.Status == SubmissionStatus.Pending)
            {
                brokenStateCount++;
                report.AuditLogDetails.Add($"Inconsistent status: Submission ID {sub.Id} has IsReviewed=true but Status=Pending");
            }
            else if (!sub.IsReviewed && sub.Status == SubmissionStatus.Graded)
            {
                brokenStateCount++;
                report.AuditLogDetails.Add($"Inconsistent status: Submission ID {sub.Id} has Status=Graded but IsReviewed=false");
            }
        }

        // Check attempt number duplicates per student/task
        var groupedSubmissions = submissions.GroupBy(s => new { s.StudentId, s.TaskId });
        foreach (var g in groupedSubmissions)
        {
            var attempts = g.Select(s => s.AttemptNumber).ToList();
            if (attempts.Count != attempts.Distinct().Count())
            {
                duplicateAttemptCount++;
                report.AuditLogDetails.Add($"Duplicate attempt numbers found for StudentId {g.Key.StudentId}, TaskId {g.Key.TaskId}");
            }
        }

        // Count pending reviews (Grouped by Student/Task, latest attempt)
        report.PendingReviews = groupedSubmissions
            .Select(g => g.OrderByDescending(s => s.SubmittedAt).ThenByDescending(s => s.AttemptNumber).First())
            .Count(latest => latest.Status == SubmissionStatus.Pending && !latest.IsReviewed);

        report.BrokenRecords = brokenStateCount;
        report.InvalidGrades = invalidGradeCount;
        report.OrphanRecords = orphanCount;
        report.DuplicateAttempts = duplicateAttemptCount;
        report.LeaderboardErrors = 0;

        report.RepairRequiredCount = brokenStateCount + invalidGradeCount + orphanCount + duplicateAttemptCount;

        double penalty = (report.RepairRequiredCount * 2.5);
        report.OverallHealthPercentage = Math.Max(0.0, Math.Round(100.0 - penalty, 1));

        return report;
    }

    public async Task<int> RunIntegrityRepairAsync(CancellationToken cancellationToken = default)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try
        {
            var submissions = await _context.Submissions.ToListAsync(cancellationToken);
            int repaired = 0;

            if (submissions.Any())
            {
                var groups = submissions.GroupBy(s => new { s.StudentId, s.TaskId });
                foreach (var g in groups)
                {
                    var sorted = g.OrderBy(s => s.SubmittedAt).ThenBy(s => s.AttemptNumber).ToList();
                    for (int i = 0; i < sorted.Count; i++)
                    {
                        var sub = sorted[i];
                        sub.AttemptNumber = i + 1;
                        bool isLatest = (i == sorted.Count - 1);

                        if (sub.Grade < 0) sub.Grade = 0;

                        if (sub.IsReviewed || sub.Grade > 0 || !string.IsNullOrWhiteSpace(sub.TeacherFeedback))
                        {
                            sub.Status = SubmissionStatus.Graded;
                            sub.IsReviewed = true;
                            if (sub.ReviewedAt == null) sub.ReviewedAt = DateTime.UtcNow;
                            repaired++;
                        }
                        else if (!isLatest)
                        {
                            sub.Status = SubmissionStatus.Graded;
                            sub.IsReviewed = true;
                            sub.Grade = 0;
                            repaired++;
                        }
                    }
                }

                await _context.SaveChangesAsync(cancellationToken);
            }

            await transaction.CommitAsync(cancellationToken);
            return repaired;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
