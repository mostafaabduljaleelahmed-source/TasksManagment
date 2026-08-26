using System;

namespace Platform.Application.Features.Dashboard.Dtos;

public class LeaderboardEntryDto
{
    public Guid StudentId { get; set; }
    public string StudentName { get; set; } = string.Empty;
    public string StudentEmail { get; set; } = string.Empty;
    public string? AvatarUrl { get; set; }
    public string StudentRegisterId { get; set; } = "-";
    public double AverageGrade { get; set; }
    public int TotalScore { get; set; }
    public int TotalPossibleScore { get; set; }
    public int CompletedTasks { get; set; }
    public int TotalTasks { get; set; }
    public int TotalSubmissions { get; set; }

    /// <summary>Competition ranking (1,2,2,4 -- ties share a rank, the next rank skips ahead by the tied group's size). Students with zero assigned tasks rank by list position without being folded into a tied group.</summary>
    public int Rank { get; set; }

    /// <summary>How many other students share this exact rank (0 if not tied).</summary>
    public int TiedCount { get; set; }

    /// <summary>Rank as of the last daily checkpoint (persisted in the database), or null if there's no prior checkpoint yet or this view doesn't track history (period-filtered views never do -- only the canonical all-time, per-scope ranking is checkpointed).</summary>
    public int? PreviousRank { get; set; }
}
