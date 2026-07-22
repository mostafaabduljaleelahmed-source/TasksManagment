namespace Platform.Application.Features.Auth.Dtos;

public class RegisterDto
{
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty; // "Teacher" or "Student"
    public string? StudentId { get; set; }
}
