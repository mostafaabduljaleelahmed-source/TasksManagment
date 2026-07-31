using System;
using System.Net;
using System.Net.Mail;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Platform.Application.Common.Interfaces;
using Platform.Domain.Entities;

namespace Platform.Application.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;
    private readonly IConfiguration _configuration;

    public EmailService(ILogger<EmailService> logger, IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
    }

    public async Task SendNewAssignmentNotificationAsync(User student, string taskTitle, string courseName, DateTime deadline, CancellationToken cancellationToken = default)
    {
        if (!student.EmailNotificationsEnabled)
        {
            _logger.LogInformation("Skipping email notification for {Email}: Notifications disabled in settings.", student.Email);
            return;
        }

        var subject = $"[New Assignment] {taskTitle} - {courseName}";
        var body = WrapTemplate(
            headerTitle: "New Assignment Published",
            badgeColor: "#7C3AED",
            contentHtml: $@"
                <p>Hello <strong>{WebUtility.HtmlEncode(student.Name)}</strong>,</p>
                <p>A new programming assignment has been published in <strong>{WebUtility.HtmlEncode(courseName)}</strong>.</p>
                <div style=""background: #1F1F24; border: 1px solid #2F2F37; padding: 16px; border-radius: 12px; margin: 20px 0;"">
                    <h3 style=""margin: 0 0 8px 0; color: #A78BFA; font-size: 16px;"">{WebUtility.HtmlEncode(taskTitle)}</h3>
                    <p style=""margin: 0; color: #A1A1AA; font-size: 13px;"">📅 Due Date: <strong>{deadline:ffff MMMM d, yyyy HH:mm} UTC</strong></p>
                </div>
                <p>Log in to your workspace to view instructions and submit your code solution.</p>"
        );

        await SendEmailAsync(student.Email, subject, body);
    }

    public async Task SendGradeReleasedNotificationAsync(User student, string taskTitle, int grade, int maxGrade, CancellationToken cancellationToken = default)
    {
        if (!student.EmailNotificationsEnabled)
        {
            _logger.LogInformation("Skipping email notification for {Email}: Notifications disabled in settings.", student.Email);
            return;
        }

        var subject = $"[Grade Released] {taskTitle} ({grade}/{maxGrade})";
        var body = WrapTemplate(
            headerTitle: "Grade Released",
            badgeColor: "#10B981",
            contentHtml: $@"
                <p>Hello <strong>{WebUtility.HtmlEncode(student.Name)}</strong>,</p>
                <p>Your submission for <strong>{WebUtility.HtmlEncode(taskTitle)}</strong> has been graded.</p>
                <div style=""background: #1F1F24; border: 1px solid #2F2F37; padding: 20px; border-radius: 12px; margin: 20px 0; text-align: center;"">
                    <span style=""font-size: 13px; color: #A1A1AA; text-transform: uppercase; font-weight: bold; letter-spacing: 1px;"">Final Score</span>
                    <h2 style=""margin: 8px 0 0 0; color: #34D399; font-size: 32px; font-weight: 800;"">{grade} <span style=""font-size: 18px; color: #71717A;"">/ {maxGrade}</span></h2>
                </div>
                <p>Visit your dashboard to view complete submission breakdown and feedback.</p>"
        );

        await SendEmailAsync(student.Email, subject, body);
    }

    public async Task SendTeacherFeedbackNotificationAsync(User student, string taskTitle, string feedback, CancellationToken cancellationToken = default)
    {
        if (!student.EmailNotificationsEnabled)
        {
            _logger.LogInformation("Skipping email notification for {Email}: Notifications disabled in settings.", student.Email);
            return;
        }

        var subject = $"[Teacher Feedback] New comments on {taskTitle}";
        var body = WrapTemplate(
            headerTitle: "New Teacher Feedback",
            badgeColor: "#C084FC",
            contentHtml: $@"
                <p>Hello <strong>{WebUtility.HtmlEncode(student.Name)}</strong>,</p>
                <p>Your instructor has provided detailed feedback on your submission for <strong>{WebUtility.HtmlEncode(taskTitle)}</strong>.</p>
                <div style=""background: #1F1F24; border-left: 4px solid #C084FC; border-top: 1px solid #2F2F37; border-right: 1px solid #2F2F37; border-bottom: 1px solid #2F2F37; padding: 16px; border-radius: 8px; margin: 20px 0; font-style: italic; color: #E4E4E7;"">
                    ""{WebUtility.HtmlEncode(feedback)}""
                </div>
                <p>Log in to review feedback notes and make any necessary code improvements.</p>"
        );

        await SendEmailAsync(student.Email, subject, body);
    }

    public async Task SendPasswordResetNotificationAsync(User user, string resetTokenOrLink, CancellationToken cancellationToken = default)
    {
        await SendPasswordResetEmailAsync(user.Email, user.Name, resetTokenOrLink, cancellationToken);
    }

    public async Task SendVerificationEmailAsync(string toEmail, string name, string token, CancellationToken cancellationToken = default)
    {
        var appBaseUrl = _configuration["App:BaseUrl"] ?? "http://jatask.runasp.net";
        var verifyLink = $"{appBaseUrl.TrimEnd('/')}/verify-email?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(toEmail)}";

        var subject = "[Action Required] Verify Your Email Address";
        var body = WrapTemplate(
            headerTitle: "Email Verification",
            badgeColor: "#3B82F6",
            contentHtml: $@"
                <p>Hello <strong>{WebUtility.HtmlEncode(name)}</strong>,</p>
                <p>Thank you for registering on our Academic Grading Platform. Please click the button below to verify your email address and activate your account:</p>
                <div style=""text-align: center; margin: 30px 0;"">
                    <a href=""{verifyLink}"" style=""display: inline-block; background-color: #3B82F6; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);"">Verify Email Address</a>
                </div>
                <p style=""font-size: 12px; color: #A1A1AA;"">Or copy and paste this link into your browser:</p>
                <p style=""font-size: 12px; word-break: break-all; color: #60A5FA;"">{WebUtility.HtmlEncode(verifyLink)}</p>
                <p style=""font-size: 12px; color: #71717A; margin-top: 20px;"">This verification link will expire in 24 hours.</p>"
        );

        await SendEmailAsync(toEmail, subject, body);
    }

    public async Task SendPasswordResetEmailAsync(string toEmail, string name, string token, CancellationToken cancellationToken = default)
    {
        var appBaseUrl = _configuration["App:BaseUrl"] ?? "http://jatask.runasp.net";
        var resetLink = $"{appBaseUrl.TrimEnd('/')}/reset-password?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(toEmail)}";

        var subject = "[Security] Password Reset Request";
        var body = WrapTemplate(
            headerTitle: "Password Reset Request",
            badgeColor: "#F59E0B",
            contentHtml: $@"
                <p>Hello <strong>{WebUtility.HtmlEncode(name)}</strong>,</p>
                <p>We received a request to reset the password for your account. Click the button below to set a new password:</p>
                <div style=""text-align: center; margin: 30px 0;"">
                    <a href=""{resetLink}"" style=""display: inline-block; background-color: #F59E0B; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.4);"">Reset Password</a>
                </div>
                <p style=""font-size: 12px; color: #A1A1AA;"">Or copy and paste this link into your browser:</p>
                <p style=""font-size: 12px; word-break: break-all; color: #FBBF24;"">{WebUtility.HtmlEncode(resetLink)}</p>
                <p style=""font-size: 12px; color: #71717A; margin-top: 20px;"">If you did not request a password reset, please ignore this email. This link will expire in 1 hour.</p>"
        );

        await SendEmailAsync(toEmail, subject, body);
    }

    private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
    {
        try
        {
            var host = _configuration["Smtp:Host"];
            var portStr = _configuration["Smtp:Port"];
            var username = _configuration["Smtp:Username"];
            var password = _configuration["Smtp:Password"];

            if (!string.IsNullOrWhiteSpace(host) && int.TryParse(portStr, out var port))
            {
                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var mail = new MailMessage
                {
                    From = new MailAddress(username ?? "noreply@educationplatform.com", "SaaS Education Platform"),
                    Subject = subject,
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                mail.To.Add(toEmail);

                await client.SendMailAsync(mail);
                _logger.LogInformation("Sent email notification to {Email} with subject '{Subject}'.", toEmail, subject);
            }
            else
            {
                // Local Development Fallback: Log Email Content Cleanly
                _logger.LogInformation(@"
[DEV EMAIL DISPATCHER]
To: {ToEmail}
Subject: {Subject}
Body Snippet: Clean responsive HTML email generated successfully.
----------------------------------------------------------------", toEmail, subject);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {Email}.", toEmail);
        }
    }

    private static string WrapTemplate(string headerTitle, string badgeColor, string contentHtml)
    {
        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""utf-8"">
    <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
</head>
<body style=""margin: 0; padding: 0; background-color: #09090B; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E4E4E7;"">
    <table role=""presentation"" width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""background-color: #09090B; padding: 40px 10px;"">
        <tr>
            <td align=""center"">
                <table role=""presentation"" width=""100%"" border=""0"" cellspacing=""0"" cellpadding=""0"" style=""max-width: 580px; background-color: #16161A; border: 1px solid #2F2F37; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);"">
                    <!-- Top Accent Bar -->
                    <tr>
                        <td style=""background-color: {badgeColor}; height: 4px;""></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                        <td style=""padding: 24px 32px; border-bottom: 1px solid #2F2F37;"">
                            <span style=""display: inline-block; background: {badgeColor}25; color: {badgeColor}; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; padding: 4px 12px; border-radius: 6px;"">
                                {WebUtility.HtmlEncode(headerTitle)}
                            </span>
                            <h2 style=""margin: 12px 0 0 0; color: #FFFFFF; font-size: 20px; font-weight: 800; tracking-tight: -0.5px;"">SaaS Educational Platform</h2>
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style=""padding: 32px; font-size: 14px; line-height: 1.6; color: #D4D4D8;"">
                            {contentHtml}
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style=""padding: 20px 32px; background-color: #111115; border-top: 1px solid #2F2F37; text-align: center; font-size: 11px; color: #71717A;"">
                            <p style=""margin: 0 0 6px 0;"">Sent automatically by SaaS Educational Platform.</p>
                            <p style=""margin: 0;"">You can disable email notifications at any time in your <a href=""#"" style=""color: #A78BFA; text-decoration: none;"">User Settings</a>.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>";
    }
}
