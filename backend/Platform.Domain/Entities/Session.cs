using System;
using System.Collections.Generic;

namespace Platform.Domain.Entities;

public class Session
{
    public Guid Id { get; set; }
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public string Title { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsUnlocked { get; set; } = false;
    public bool IsArchived { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProgrammingTask> Tasks { get; set; } = new List<ProgrammingTask>();
}
