using System;

namespace Platform.Domain.Entities;

public class SystemSetting
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string AcademyName { get; set; } = "Grading Platform Private Academy";
    public string? AcademyLogo { get; set; }
    public string PrimaryColor { get; set; } = "#7C3AED";
    public string SecondaryColor { get; set; } = "#4F46E5";
    public string ContactEmail { get; set; } = "contact@academy.com";
    public string SupportEmail { get; set; } = "support@academy.com";
    public string FooterText { get; set; } = "© 2026 Private Academy. All rights reserved.";
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
