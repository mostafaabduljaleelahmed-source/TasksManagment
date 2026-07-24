using System;

namespace Platform.Application.Features.Auth.Dtos;

public class AuthResponseDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string? StudentId { get; set; }
    public string? AvatarUrl { get; set; }
    public string Token { get; set; } = string.Empty;
}
