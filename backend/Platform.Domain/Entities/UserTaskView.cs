using System;

namespace Platform.Domain.Entities;

public class UserTaskView
{
    public Guid Id { get; set; }
    public Guid StudentId { get; set; }
    public User Student { get; set; } = null!;
    public Guid TaskId { get; set; }
    public ProgrammingTask Task { get; set; } = null!;
    public DateTime ViewedAt { get; set; } = DateTime.UtcNow;
}
