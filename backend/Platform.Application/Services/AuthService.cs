using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Auth.Dtos;
using Platform.Domain.Entities;
using Platform.Domain.Enums;

namespace Platform.Application.Services;

public class AuthService : IAuthService
{
    private readonly IApplicationDbContext _context;
    private readonly IHashService _hashService;
    private readonly IJwtTokenGenerator _tokenGenerator;

    public AuthService(
        IApplicationDbContext context,
        IHashService hashService,
        IJwtTokenGenerator tokenGenerator)
    {
        _context = context;
        _hashService = hashService;
        _tokenGenerator = tokenGenerator;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password) || string.IsNullOrWhiteSpace(dto.Name))
        {
            throw new ArgumentException("Name, Email, and Password are required fields.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var existingUser = await _context.Users.AnyAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (existingUser)
        {
            throw new InvalidOperationException("A user with this email address already exists.");
        }

        if (!Enum.TryParse<UserRole>(dto.Role, true, out var parsedRole))
        {
            parsedRole = UserRole.Student; // Fallback to student
        }

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _hashService.HashPassword(dto.Password),
            Role = parsedRole,
            StudentId = parsedRole == UserRole.Student ? dto.StudentId?.Trim() : null,
            JoinedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        var token = _tokenGenerator.GenerateToken(user);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            StudentId = user.StudentId,
            Token = token
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
        {
            throw new ArgumentException("Email and Password are required fields.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);
        if (user == null || !_hashService.VerifyPassword(dto.Password, user.PasswordHash))
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        var token = _tokenGenerator.GenerateToken(user);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            StudentId = user.StudentId,
            Token = token
        };
    }
}
