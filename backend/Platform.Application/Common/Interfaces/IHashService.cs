namespace Platform.Application.Common.Interfaces;

public interface IHashService
{
    string HashPassword(string password);
    bool VerifyPassword(string password, string passwordHash);
}
