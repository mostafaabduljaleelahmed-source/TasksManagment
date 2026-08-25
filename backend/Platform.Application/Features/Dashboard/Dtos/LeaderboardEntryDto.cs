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
    public int CompletedTasks { get; set; }
    public int TotalTasks { get; set; }
    public int TotalSubmissions { get; set; }
}
