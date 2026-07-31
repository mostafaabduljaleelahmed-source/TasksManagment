using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Platform.Infrastructure.Persistence;

public static class DatabaseMigrationHelper
{
    public static void EnsureDatabaseMigrated(ApplicationDbContext context, ILogger logger)
    {
        try
        {
            logger.LogInformation("Applying database migrations...");
            context.Database.Migrate();
            logger.LogInformation("Database migration completed successfully.");

            // Seed permanent single Admin account if not already present
            SeedAdminUser(context, logger);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "An error occurred while applying database migrations.");
        }
    }

    private static void SeedAdminUser(ApplicationDbContext context, ILogger logger)
    {
        try
        {
            var targetAdminEmail = "mostafaabduljaleelahmed@gmail.com";

            // Clean up old default seeded admin if present
            var oldDefaultAdmin = context.Users.FirstOrDefault(u => u.Email == "admin@academy.com");
            if (oldDefaultAdmin != null)
            {
                context.Users.Remove(oldDefaultAdmin);
                context.SaveChanges();
                logger.LogInformation("Removed legacy default admin account (admin@academy.com).");
            }

            // Find target admin account
            var targetAdmin = context.Users.FirstOrDefault(u => u.Email == targetAdminEmail);

            if (targetAdmin != null)
            {
                // Account exists: promote to Admin, verify email, retain all data
                targetAdmin.Role = Domain.Enums.UserRole.Admin;
                targetAdmin.IsEmailVerified = true;
                logger.LogInformation("Promoted existing user '{Email}' to System Administrator.", targetAdminEmail);
            }
            else
            {
                // Create new Admin account with a random initial password (no hardcoded passwords)
                var randomPassword = Guid.NewGuid().ToString("N");
                targetAdmin = new Domain.Entities.User
                {
                    Id = Guid.NewGuid(),
                    Name = "Mostafa Abduljaleel",
                    Email = targetAdminEmail,
                    PasswordHash = BCrypt.Net.BCrypt.HashPassword(randomPassword),
                    Role = Domain.Enums.UserRole.Admin,
                    IsEmailVerified = true,
                    JoinedAt = DateTime.UtcNow
                };
                context.Users.Add(targetAdmin);
                logger.LogInformation("Created new Administrator account for '{Email}'.", targetAdminEmail);
            }

            // Enforce single Admin rule: demote any other users with Role == Admin
            var otherAdmins = context.Users
                .Where(u => u.Role == Domain.Enums.UserRole.Admin && u.Email != targetAdminEmail)
                .ToList();

            foreach (var otherAdmin in otherAdmins)
            {
                otherAdmin.Role = Domain.Enums.UserRole.Student;
                logger.LogInformation("Demoted extra admin account '{Email}' to Student.", otherAdmin.Email);
            }

            context.SaveChanges();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to initialize Administrator account.");
        }
    }
}
