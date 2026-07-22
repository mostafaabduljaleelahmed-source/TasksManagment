using System;

namespace Platform.Domain.Entities;

public class CourseTeacher
{
    public Guid CourseId { get; set; }
    public Course Course { get; set; } = null!;
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}
