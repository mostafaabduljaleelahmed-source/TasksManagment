using System;

namespace Platform.Domain.Entities;

/// <summary>
/// A durable, once-per-day-at-most checkpoint of a student's leaderboard rank, scoped to a
/// course (or null for the cross-course view). One row per (StudentId, CourseId): it is
/// overwritten no more than once every 24 hours, so it always holds "roughly yesterday's rank"
/// rather than growing into an unbounded history table. This is what backs the real,
/// database-persisted rank-change arrow -- not a per-browser guess.
/// </summary>
public class LeaderboardRankCheckpoint
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;
    public Guid? CourseId { get; set; }
    public Course? Course { get; set; }
    public int Rank { get; set; }
    public int Score { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
}
