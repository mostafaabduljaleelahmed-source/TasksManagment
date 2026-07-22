using Microsoft.Extensions.DependencyInjection;
using Platform.Application.Common.Interfaces;
using Platform.Application.Services;
using Platform.Application.Services.Grading;

namespace Platform.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<ICourseService, CourseService>();
        services.AddScoped<ISessionService, SessionService>();
        services.AddScoped<ITaskService, TaskService>();
        services.AddScoped<ISubmissionService, SubmissionService>();

        // Version 2.0 Intelligent Education & Grading Services
        services.AddSingleton<ILanguageRegistry, LanguageRegistry>();
        services.AddScoped<IGradingModule, ManualReviewModule>();
        services.AddScoped<IGradingModule, Judge0AutoGradingModule>();
        services.AddScoped<IGradingEngineDispatcher, GradingEngineDispatcher>();

        return services;
    }
}
