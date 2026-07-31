using System;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Auth.Dtos;

namespace Platform.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "Admin")]
public class AdminController : ControllerBase
{
    private readonly IApplicationDbContext _context;
    private readonly IHashService _hashService;

    public AdminController(IApplicationDbContext context, IHashService hashService)
    {
        _context = context;
        _hashService = hashService;
    }

    [HttpPost("reset-admin-password")]
    public async Task<IActionResult> ResetAdminPassword([FromBody] ResetAdminPasswordDto dto, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(dto.NewPassword) || dto.NewPassword.Length < 6)
        {
            return BadRequest(new { message = "New password must be at least 6 characters long." });
        }

        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            return Unauthorized(new { message = "User identity not found." });
        }

        var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Id == userId, cancellationToken);
        if (adminUser == null || adminUser.Role != Domain.Enums.UserRole.Admin)
        {
            return Forbid("Only the system administrator can perform this action.");
        }

        // If CurrentPassword is provided, verify it unless user is Google-linked without a local password setup
        if (!string.IsNullOrWhiteSpace(dto.CurrentPassword))
        {
            var isCurrentPasswordValid = _hashService.VerifyPassword(dto.CurrentPassword, adminUser.PasswordHash);
            if (!isCurrentPasswordValid && string.IsNullOrEmpty(adminUser.GoogleId))
            {
                return BadRequest(new { message = "Current password is incorrect." });
            }
        }
        else
        {
            // If CurrentPassword is not provided, allow bypass ONLY if account is linked with Google OAuth
            if (string.IsNullOrEmpty(adminUser.GoogleId))
            {
                return BadRequest(new { message = "Current password is required to change password." });
            }
        }

        // Hash new password using BCrypt hashing service
        adminUser.PasswordHash = _hashService.HashPassword(dto.NewPassword);

        // Invalidate all active refresh tokens for security
        adminUser.RefreshToken = null;
        adminUser.RefreshTokenExpires = null;

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true, message = "Administrator password updated successfully. All previous sessions have been invalidated." });
    }
}
