using System;
using System.Collections.Generic;
using Platform.Domain.Enums;

namespace Platform.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; }
    public string? StudentId { get; set; }
    public string? AvatarUrl { get; set; }
    public string? GoogleId { get; set; }
    public bool IsEmailVerified { get; set; } = false;
    public string? EmailVerificationToken { get; set; }
    public DateTime? EmailVerificationTokenExpires { get; set; }
    public string? PasswordResetToken { get; set; }
    public DateTime? PasswordResetTokenExpires { get; set; }
    public string? RefreshToken { get; set; }
    public DateTime? RefreshTokenExpires { get; set; }
    public int FailedLoginAttempts { get; set; } = 0;
    public DateTime? LockoutEnd { get; set; }
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool IsDisabled { get; set; } = false;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public ICollection<Course> CreatedCourses { get; set; } = new List<Course>();
    public ICollection<Enrollment> Enrollments { get; set; } = new List<Enrollment>();
    public ICollection<CourseTeacher> CourseTeachers { get; set; } = new List<CourseTeacher>();
}
