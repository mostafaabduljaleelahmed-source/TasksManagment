using Platform.Domain.Entities;

namespace Platform.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}
