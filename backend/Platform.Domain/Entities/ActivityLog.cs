using System;

namespace Platform.Domain.Entities;

public class ActivityLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Action { get; set; } = string.Empty;
    public string Details { get; set; } = string.Empty;
    public Guid? CourseId { get; set; }
    public Course? Course { get; set; }
    public string? CourseName { get; set; }
    public Guid? TaskId { get; set; }
    public ProgrammingTask? Task { get; set; }
    public string? TaskTitle { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
