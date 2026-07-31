using System.Threading;
using System.Threading.Tasks;
using Platform.Application.Features.Auth.Dtos;

namespace Platform.Application.Common.Interfaces;

public interface IAuthService
{
    Task<AuthResponseDto> RegisterAsync(RegisterDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> LoginAsync(LoginDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> GoogleLoginAsync(GoogleLoginDto dto, CancellationToken cancellationToken = default);
    Task<bool> VerifyEmailAsync(VerifyEmailDto dto, CancellationToken cancellationToken = default);
    Task<bool> ResendVerificationEmailAsync(ResendVerificationDto dto, CancellationToken cancellationToken = default);
    Task<bool> ForgotPasswordAsync(ForgotPasswordDto dto, CancellationToken cancellationToken = default);
    Task<bool> ResetPasswordAsync(ResetPasswordDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> RefreshTokenAsync(RefreshTokenDto dto, CancellationToken cancellationToken = default);
    Task<AuthResponseDto> CreateTeacherAsync(CreateTeacherDto dto, CancellationToken cancellationToken = default);
}
