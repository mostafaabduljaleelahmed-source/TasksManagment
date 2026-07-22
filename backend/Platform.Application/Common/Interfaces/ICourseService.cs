using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Features.Courses.Dtos;

namespace Platform.Application.Common.Interfaces;

public interface ICourseService
{
    Task<CourseDto> CreateCourseAsync(Guid teacherId, CreateCourseDto dto, CancellationToken cancellationToken = default);
    Task<List<CourseDto>> GetTeacherCoursesAsync(Guid teacherId, CancellationToken cancellationToken = default);
    Task<List<CourseDto>> GetStudentCoursesAsync(Guid studentId, CancellationToken cancellationToken = default);
    Task<CourseDto> JoinCourseAsync(Guid studentId, string courseCode, CancellationToken cancellationToken = default);
    Task DeleteCourseAsync(Guid courseId, Guid teacherId, CancellationToken cancellationToken = default);
    Task RemoveStudentAsync(Guid courseId, Guid studentId, Guid teacherId, CancellationToken cancellationToken = default);
}
