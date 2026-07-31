using System;
using System.Security.Cryptography;
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
    private readonly IGoogleAuthService _googleAuthService;
    private readonly IEmailService _emailService;

    public AuthService(
        IApplicationDbContext context,
        IHashService hashService,
        IJwtTokenGenerator tokenGenerator,
        IGoogleAuthService googleAuthService,
        IEmailService emailService)
    {
        _context = context;
        _hashService = hashService;
        _tokenGenerator = tokenGenerator;
        _googleAuthService = googleAuthService;
        _emailService = emailService;
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

        // Force Role = Student for all public registration (ignore any dto.Role from frontend)
        var parsedRole = UserRole.Student;

        var verificationToken = GenerateSecureToken();

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _hashService.HashPassword(dto.Password),
            Role = parsedRole,
            StudentId = dto.StudentId?.Trim(),
            IsEmailVerified = false,
            EmailVerificationToken = verificationToken,
            EmailVerificationTokenExpires = DateTime.UtcNow.AddHours(24),
            JoinedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        // Dispatch Verification Email
        await _emailService.SendVerificationEmailAsync(user.Email, user.Name, verificationToken, cancellationToken);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            StudentId = user.StudentId,
            AvatarUrl = user.AvatarUrl,
            IsEmailVerified = false,
            Token = string.Empty,
            RefreshToken = string.Empty,
            Message = "Registration successful! Please check your email inbox to verify your account before logging in."
        };
    }

    public async Task<AuthResponseDto> CreateTeacherAsync(CreateTeacherDto dto, CancellationToken cancellationToken = default)
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

        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = dto.Name.Trim(),
            Email = normalizedEmail,
            PasswordHash = _hashService.HashPassword(dto.Password),
            Role = UserRole.Teacher,
            IsEmailVerified = true, // Teacher accounts created by Admin are pre-verified
            JoinedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            IsEmailVerified = true,
            Message = "Teacher account created successfully."
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

        if (user == null)
        {
            throw new InvalidOperationException("Invalid email or password.");
        }

        if (user.IsDisabled)
        {
            throw new InvalidOperationException("Your account has been disabled by the Administrator. Please contact support.");
        }

        // Account Lockout check
        if (user.LockoutEnd.HasValue && user.LockoutEnd.Value > DateTime.UtcNow)
        {
            var remainingMinutes = Math.Ceiling((user.LockoutEnd.Value - DateTime.UtcNow).TotalMinutes);
            throw new InvalidOperationException($"Account is temporarily locked due to multiple failed login attempts. Please try again in {remainingMinutes} minutes.");
        }

        // Verify Password
        if (!_hashService.VerifyPassword(dto.Password, user.PasswordHash))
        {
            user.FailedLoginAttempts++;
            if (user.FailedLoginAttempts >= 5)
            {
                user.LockoutEnd = DateTime.UtcNow.AddMinutes(15);
            }
            await _context.SaveChangesAsync(cancellationToken);
            throw new InvalidOperationException("Invalid email or password.");
        }

        // Verify Email check
        if (!user.IsEmailVerified)
        {
            throw new InvalidOperationException("Please verify your email address before logging in. Check your inbox for the verification link.");
        }

        // Reset failed login counters
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        var token = _tokenGenerator.GenerateToken(user);
        var refreshToken = GenerateSecureToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            StudentId = user.StudentId,
            AvatarUrl = user.AvatarUrl,
            IsEmailVerified = true,
            Token = token,
            RefreshToken = refreshToken
        };
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto dto, CancellationToken cancellationToken = default)
    {
        var googleUser = await _googleAuthService.ValidateIdTokenAsync(dto.IdToken, cancellationToken);

        var user = await _context.Users.FirstOrDefaultAsync(u => u.GoogleId == googleUser.GoogleId || u.Email == googleUser.Email, cancellationToken);

        var targetAdminEmail = "mostafaabduljaleelahmed@gmail.com";
        var isTargetAdmin = googleUser.Email.Equals(targetAdminEmail, StringComparison.OrdinalIgnoreCase);

        if (user == null)
        {
            // Auto-register new Google user: assign Role = Admin if target admin email, otherwise Student
            user = new User
            {
                Id = Guid.NewGuid(),
                GoogleId = googleUser.GoogleId,
                Name = googleUser.Name,
                Email = googleUser.Email,
                AvatarUrl = googleUser.Picture,
                IsEmailVerified = true, // Google accounts are pre-verified
                Role = isTargetAdmin ? UserRole.Admin : UserRole.Student,
                PasswordHash = _hashService.HashPassword(Guid.NewGuid().ToString("N")),
                JoinedAt = DateTime.UtcNow
            };

            _context.Users.Add(user);
        }
        else
        {
            // Link existing account with GoogleId & verify
            user.GoogleId = googleUser.GoogleId;
            user.IsEmailVerified = true;
            user.AvatarUrl ??= googleUser.Picture;

            if (isTargetAdmin)
            {
                user.Role = UserRole.Admin;
            }

            if (user.IsDisabled)
            {
                throw new InvalidOperationException("Your account has been disabled by the Administrator. Please contact support.");
            }
        }

        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        var token = _tokenGenerator.GenerateToken(user);
        var refreshToken = GenerateSecureToken();
        user.RefreshToken = refreshToken;
        user.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            StudentId = user.StudentId,
            AvatarUrl = user.AvatarUrl,
            IsEmailVerified = true,
            Token = token,
            RefreshToken = refreshToken
        };
    }

    public async Task<bool> VerifyEmailAsync(VerifyEmailDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Token))
        {
            throw new ArgumentException("Email and verification token are required.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null || user.EmailVerificationToken != dto.Token)
        {
            throw new InvalidOperationException("Invalid verification token or email address.");
        }

        if (user.EmailVerificationTokenExpires.HasValue && user.EmailVerificationTokenExpires.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Verification token has expired. Please request a new verification email.");
        }

        user.IsEmailVerified = true;
        user.EmailVerificationToken = null;
        user.EmailVerificationTokenExpires = null;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ResendVerificationEmailAsync(ResendVerificationDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new ArgumentException("Email address is required.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null || user.IsEmailVerified)
        {
            return true; // Silent success for security/privacy
        }

        var token = GenerateSecureToken();
        user.EmailVerificationToken = token;
        user.EmailVerificationTokenExpires = DateTime.UtcNow.AddHours(24);

        await _context.SaveChangesAsync(cancellationToken);
        await _emailService.SendVerificationEmailAsync(user.Email, user.Name, token, cancellationToken);

        return true;
    }

    public async Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email))
        {
            throw new ArgumentException("Email address is required.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null)
        {
            return true; // Silent success for security
        }

        var token = GenerateSecureToken();
        user.PasswordResetToken = token;
        user.PasswordResetTokenExpires = DateTime.UtcNow.AddHours(1);

        await _context.SaveChangesAsync(cancellationToken);
        await _emailService.SendPasswordResetEmailAsync(user.Email, user.Name, token, cancellationToken);

        return true;
    }

    public async Task<bool> ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Token) || string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            throw new ArgumentException("Email, token, and new password are required.");
        }

        var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null || user.PasswordResetToken != dto.Token)
        {
            throw new InvalidOperationException("Invalid password reset token or email address.");
        }

        if (user.PasswordResetTokenExpires.HasValue && user.PasswordResetTokenExpires.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Password reset token has expired. Please request a new password reset link.");
        }

        user.PasswordHash = _hashService.HashPassword(dto.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpires = null;
        user.FailedLoginAttempts = 0;
        user.LockoutEnd = null;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(dto.RefreshToken))
        {
            throw new ArgumentException("Refresh Token is required.");
        }

        var user = await _context.Users.FirstOrDefaultAsync(u => u.RefreshToken == dto.RefreshToken, cancellationToken);

        if (user == null || !user.RefreshTokenExpires.HasValue || user.RefreshTokenExpires.Value < DateTime.UtcNow)
        {
            throw new InvalidOperationException("Invalid or expired Refresh Token. Please log in again.");
        }

        var newToken = _tokenGenerator.GenerateToken(user);
        var newRefreshToken = GenerateSecureToken();

        user.RefreshToken = newRefreshToken;
        user.RefreshTokenExpires = DateTime.UtcNow.AddDays(7);

        await _context.SaveChangesAsync(cancellationToken);

        return new AuthResponseDto
        {
            Id = user.Id,
            Name = user.Name,
            Email = user.Email,
            Role = user.Role.ToString(),
            StudentId = user.StudentId,
            AvatarUrl = user.AvatarUrl,
            IsEmailVerified = user.IsEmailVerified,
            Token = newToken,
            RefreshToken = newRefreshToken
        };
    }

    private static string GenerateSecureToken()
    {
        var bytes = new byte[32];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}
