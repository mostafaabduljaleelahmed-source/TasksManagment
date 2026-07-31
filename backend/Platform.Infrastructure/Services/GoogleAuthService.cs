using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Google.Apis.Auth;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Platform.Application.Common.Interfaces;

namespace Platform.Infrastructure.Services;

public class GoogleAuthService : IGoogleAuthService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<GoogleAuthService> _logger;

    public GoogleAuthService(IConfiguration configuration, ILogger<GoogleAuthService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<GoogleUserInfo> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(idToken))
        {
            throw new ArgumentException("Google ID Token is required.");
        }

        try
        {
            var clientId = _configuration["Google:ClientId"];
            if (string.IsNullOrWhiteSpace(clientId))
            {
                throw new InvalidOperationException("Google Client ID is not configured on the server.");
            }

            var validationSettings = new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = new List<string> { clientId }
            };

            var payload = await GoogleJsonWebSignature.ValidateAsync(idToken, validationSettings);

            if (payload == null || string.IsNullOrWhiteSpace(payload.Email))
            {
                throw new InvalidOperationException("Invalid Google token payload.");
            }

            return new GoogleUserInfo
            {
                GoogleId = payload.Subject,
                Email = payload.Email.Trim().ToLowerInvariant(),
                EmailVerified = payload.EmailVerified,
                Name = payload.Name ?? payload.Email.Split('@')[0],
                Picture = payload.Picture
            };
        }
        catch (InvalidJwtException ex)
        {
            _logger.LogWarning(ex, "Google ID Token validation failed: Invalid JWT.");
            throw new InvalidOperationException("Invalid or expired Google token.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Google ID Token validation error.");
            throw new InvalidOperationException($"Google authentication error: {ex.Message}");
        }
    }
}
