using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Courses.Dtos;
using Platform.Domain.Entities;

namespace Platform.Application.Services;

public class CourseService : ICourseService
{
    private readonly IApplicationDbContext _context;

    public CourseService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CourseDto> CreateCourseAsync(Guid teacherId, CreateCourseDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Course Name is required.");
        }

        // Generate a unique 6-character course code
        string courseCode;
        var random = new Random();
        const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        do
        {
            courseCode = new string(Enumerable.Repeat(chars, 6)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        } while (await _context.Courses.AnyAsync(c => c.CourseCode == courseCode, cancellationToken));

        var course = new Course
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Description = dto.Description.Trim(),
            CourseCode = courseCode,
            TeacherId = teacherId,
            CreatedAt = DateTime.UtcNow
        };

        _context.Courses.Add(course);

        // Also add the creator teacher as a collaborator in CourseTeachers list
        var courseTeacher = new CourseTeacher
        {
            CourseId = course.Id,
            TeacherId = teacherId,
            AssignedAt = DateTime.UtcNow
        };
        _context.CourseTeachers.Add(courseTeacher);

        await _context.SaveChangesAsync(cancellationToken);

        var teacher = await _context.Users.FindAsync(new object[] { teacherId }, cancellationToken);

        return new CourseDto
        {
            Id = course.Id,
            Name = course.Name,
            Description = course.Description,
            CourseCode = course.CourseCode,
            TeacherId = course.TeacherId,
            TeacherName = teacher?.Name ?? "Instructor",
            CreatedAt = course.CreatedAt
        };
    }

    public async Task<List<CourseDto>> GetTeacherCoursesAsync(Guid teacherId, CancellationToken cancellationToken = default)
    {
        // Get courses where the user is either the primary teacher or a collaborator
        var courseIds = await _context.CourseTeachers
            .Where(ct => ct.TeacherId == teacherId)
            .Select(ct => ct.CourseId)
            .ToListAsync(cancellationToken);

        return await _context.Courses
            .Include(c => c.Teacher)
            .Where(c => c.TeacherId == teacherId || courseIds.Contains(c.Id))
            .Select(c => new CourseDto
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                CourseCode = c.CourseCode,
                TeacherId = c.TeacherId,
                TeacherName = c.Teacher.Name,
                CreatedAt = c.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<List<CourseDto>> GetStudentCoursesAsync(Guid studentId, CancellationToken cancellationToken = default)
    {
        return await _context.Enrollments
            .Include(e => e.Course)
            .ThenInclude(c => c.Teacher)
            .Where(e => e.StudentId == studentId)
            .Select(e => new CourseDto
            {
                Id = e.Course.Id,
                Name = e.Course.Name,
                Description = e.Course.Description,
                CourseCode = e.Course.CourseCode,
                TeacherId = e.Course.TeacherId,
                TeacherName = e.Course.Teacher.Name,
                CreatedAt = e.Course.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }

    public async Task<CourseDto> JoinCourseAsync(Guid studentId, string courseCode, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(courseCode))
        {
            throw new ArgumentException("Course Code is required.");
        }

        var normalizedCode = courseCode.Trim().ToUpperInvariant();
        var course = await _context.Courses
            .Include(c => c.Teacher)
            .FirstOrDefaultAsync(c => c.CourseCode == normalizedCode, cancellationToken);

        if (course == null)
        {
            throw new InvalidOperationException("Invalid course code. Course not found.");
        }

        var alreadyInAnyGroup = await _context.Enrollments
            .AnyAsync(e => e.StudentId == studentId, cancellationToken);

        if (alreadyInAnyGroup)
        {
            throw new InvalidOperationException("You are already enrolled in a group. Students can only belong to one group at a time.");
        }

        var enrollment = new Enrollment
        {
            StudentId = studentId,
            CourseId = course.Id,
            EnrolledAt = DateTime.UtcNow
        };

        _context.Enrollments.Add(enrollment);
        await _context.SaveChangesAsync(cancellationToken);

        return new CourseDto
        {
            Id = course.Id,
            Name = course.Name,
            Description = course.Description,
            CourseCode = course.CourseCode,
            TeacherId = course.TeacherId,
            TeacherName = course.Teacher.Name,
            CreatedAt = course.CreatedAt
        };
    }

    public async Task DeleteCourseAsync(Guid courseId, Guid teacherId, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

        if (course == null)
        {
            throw new InvalidOperationException("Course not found.");
        }

        if (course.TeacherId != teacherId)
        {
            var isCollaborator = await _context.CourseTeachers
                .AnyAsync(ct => ct.CourseId == courseId && ct.TeacherId == teacherId, cancellationToken);
            if (!isCollaborator)
            {
                throw new UnauthorizedAccessException("Only authorized course teachers can delete this course.");
            }
        }

        _context.Courses.Remove(course);
        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task RemoveStudentAsync(Guid courseId, Guid studentId, Guid teacherId, CancellationToken cancellationToken = default)
    {
        var course = await _context.Courses
            .FirstOrDefaultAsync(c => c.Id == courseId, cancellationToken);

        if (course == null)
        {
            throw new InvalidOperationException("Course not found.");
        }

        var enrollment = await _context.Enrollments
            .FirstOrDefaultAsync(e => e.CourseId == courseId && e.StudentId == studentId, cancellationToken);

        if (enrollment == null)
        {
            throw new InvalidOperationException("Student enrollment not found in this course.");
        }

        _context.Enrollments.Remove(enrollment);
        await _context.SaveChangesAsync(cancellationToken);
    }
}
