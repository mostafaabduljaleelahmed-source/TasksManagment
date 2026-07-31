using System.Threading;
using System.Threading.Tasks;

namespace Platform.Application.Common.Interfaces;

public class GoogleUserInfo
{
    public string GoogleId { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public bool EmailVerified { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Picture { get; set; }
}

public interface IGoogleAuthService
{
    Task<GoogleUserInfo> ValidateIdTokenAsync(string idToken, CancellationToken cancellationToken = default);
}
