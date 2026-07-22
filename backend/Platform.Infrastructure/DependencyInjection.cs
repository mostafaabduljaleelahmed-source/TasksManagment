using System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Platform.Application.Common.Interfaces;
using Platform.Infrastructure.Execution;
using Platform.Infrastructure.Persistence;
using Platform.Infrastructure.Security;
using Platform.Infrastructure.Services;

namespace Platform.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection") 
            ?? "Data Source=gradingplatform.db";

        services.AddDbContextPool<ApplicationDbContext>(options =>
        {
            var dbProvider = configuration["DatabaseProvider"];
            if (string.Equals(dbProvider, "Sqlite", StringComparison.OrdinalIgnoreCase) || connectionString.Contains(".db") || connectionString.Contains(".sqlite"))
            {
                options.UseSqlite(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));
            }
            else
            {
                options.UseSqlServer(connectionString, b => b.MigrationsAssembly(typeof(ApplicationDbContext).Assembly.FullName));
            }
        });

        services.AddScoped<IApplicationDbContext>(provider => provider.GetRequiredService<ApplicationDbContext>());

        services.AddSingleton<IHashService, BCryptHashService>();
        services.AddSingleton<IJwtTokenGenerator, JwtTokenGenerator>();
        services.AddScoped<ICodeExecutionService, PythonExecutionService>();

        // Version 2.0 Isolated Code Execution Engine (Judge0)
        services.AddSingleton(new HttpClient());
        services.AddScoped<IExecutionService, Judge0ExecutionService>();

        return services;
    }
}
