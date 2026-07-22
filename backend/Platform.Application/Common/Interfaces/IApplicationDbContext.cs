using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Domain.Entities;

namespace Platform.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Course> Courses { get; }
    DbSet<Enrollment> Enrollments { get; }
    DbSet<CourseTeacher> CourseTeachers { get; }
    DbSet<Session> Sessions { get; }
    DbSet<ProgrammingTask> ProgrammingTasks { get; }
    DbSet<Submission> Submissions { get; }
    DbSet<Notification> Notifications { get; }
    DbSet<UserTaskView> UserTaskViews { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
