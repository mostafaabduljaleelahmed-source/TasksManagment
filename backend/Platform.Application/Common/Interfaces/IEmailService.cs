using System;
using System.Threading;
using System.Threading.Tasks;
using Platform.Domain.Entities;

namespace Platform.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendNewAssignmentNotificationAsync(User student, string taskTitle, string courseName, DateTime deadline, CancellationToken cancellationToken = default);
    Task SendGradeReleasedNotificationAsync(User student, string taskTitle, int grade, int maxGrade, CancellationToken cancellationToken = default);
    Task SendTeacherFeedbackNotificationAsync(User student, string taskTitle, string feedback, CancellationToken cancellationToken = default);
    Task SendPasswordResetNotificationAsync(User user, string resetTokenOrLink, CancellationToken cancellationToken = default);
    Task SendVerificationEmailAsync(string toEmail, string name, string token, CancellationToken cancellationToken = default);
    Task SendPasswordResetEmailAsync(string toEmail, string name, string token, CancellationToken cancellationToken = default);
}
