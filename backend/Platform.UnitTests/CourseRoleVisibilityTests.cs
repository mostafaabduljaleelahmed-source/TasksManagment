using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using Platform.Application.Services;
using Platform.Domain.Entities;
using Platform.Application.Features.Courses.Dtos;
using Microsoft.EntityFrameworkCore;
using Platform.Infrastructure.Persistence;

namespace Platform.UnitTests;

public class CourseRoleVisibilityTests
{
    private ApplicationDbContext GetInMemoryDbContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        var context = new ApplicationDbContext(options);

        var adminId = Guid.NewGuid();
        var teacherId = Guid.NewGuid();

        var adminUser = new User { Id = adminId, Name = "Admin", Email = "admin@test.com", Role = Domain.Enums.UserRole.Admin, PasswordHash = "hash" };
        var teacherUser = new User { Id = teacherId, Name = "Teacher", Email = "teacher@test.com", Role = Domain.Enums.UserRole.Teacher, PasswordHash = "hash" };

        var course1 = new Course { Id = Guid.NewGuid(), Name = "CS101", CourseCode = "CS101", TeacherId = teacherId, Teacher = teacherUser, IsArchived = false };
        var course2 = new Course { Id = Guid.NewGuid(), Name = "CS102", CourseCode = "CS102", TeacherId = adminId, Teacher = adminUser, IsArchived = false };

        context.Users.AddRange(adminUser, teacherUser);
        context.Courses.AddRange(course1, course2);
        context.SaveChanges();

        return context;
    }

    [Fact]
    public async Task AdminUser_GetTeacherCoursesAsync_ReturnsAllCourses()
    {
        using var context = GetInMemoryDbContext();
        var service = new CourseService(context, Moq.Mock.Of<Platform.Application.Common.Interfaces.IActivityLogger>());

        var courses = await service.GetTeacherCoursesAsync(Guid.NewGuid(), isAdmin: true);

        Assert.Equal(2, courses.Count);
    }

    [Fact]
    public async Task TeacherUser_GetTeacherCoursesAsync_ReturnsOnlyOwnedCourses()
    {
        using var context = GetInMemoryDbContext();
        var service = new CourseService(context, Moq.Mock.Of<Platform.Application.Common.Interfaces.IActivityLogger>());
        var teacher = await context.Users.FirstAsync(u => u.Role == Domain.Enums.UserRole.Teacher);

        var courses = await service.GetTeacherCoursesAsync(teacher.Id, isAdmin: false);

        Assert.Single(courses);
        Assert.Equal("CS101", courses[0].CourseCode);
    }
}
