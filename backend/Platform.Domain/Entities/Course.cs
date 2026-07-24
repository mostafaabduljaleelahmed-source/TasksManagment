using System;
using System.Collections.Generic;

namespace Platform.Domain.Entities;

public class Course
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CourseCode { get; set; } = string.Empty;
    public Guid TeacherId { get; set; }
    public User Teacher { get; set; } = null!;
    public bool IsArchived { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<CourseTeacher> CourseTeachers { get; set; } = new List<CourseTeacher>();
    public ICollection<Session> Sessions { get; set; } = new List<Session>();
}
