using System;

namespace Platform.Domain.Entities;

public class Notification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public Guid? TaskId { get; set; }
    public Guid? StudentId { get; set; }
    public Guid? SubmissionId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
