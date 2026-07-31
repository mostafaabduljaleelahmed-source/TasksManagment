namespace Platform.Application.Features.Auth.Dtos;

public class ResetAdminPasswordDto
{
    public string? CurrentPassword { get; set; }
    public string NewPassword { get; set; } = string.Empty;
}
