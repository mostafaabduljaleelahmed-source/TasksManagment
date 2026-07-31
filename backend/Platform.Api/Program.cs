using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using Platform.Api.Middleware;
using Platform.Application;
using Platform.Infrastructure;
using Platform.Infrastructure.Persistence;

using Microsoft.Extensions.FileProviders;

var builder = WebApplication.CreateBuilder(args);

if (!Directory.Exists(Path.Combine(builder.Environment.ContentRootPath, "wwwroot")))
{
    builder.Environment.WebRootPath = builder.Environment.ContentRootPath;
    builder.Environment.WebRootFileProvider = new PhysicalFileProvider(builder.Environment.ContentRootPath);
}

// Add Clean Architecture project services
builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Configure JWT Authentication
var secretKey = builder.Configuration["Jwt:Secret"] ?? "SuperSecretSecureKeyForGradingPlatform2026!";
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "GradingPlatform",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "GradingPlatform",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

var app = builder.Build();

var staticRootPath = Directory.Exists(Path.Combine(app.Environment.ContentRootPath, "wwwroot"))
    ? Path.Combine(app.Environment.ContentRootPath, "wwwroot")
    : app.Environment.ContentRootPath;

app.Environment.WebRootPath = staticRootPath;
app.Environment.WebRootFileProvider = new PhysicalFileProvider(staticRootPath);

// Global Exception Middleware (catches all exceptions and guarantees JSON error responses)
app.UseMiddleware<GlobalExceptionMiddleware>();

// Ensure Database Schema is Migrated and Auto-Synced
using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();
    DatabaseMigrationHelper.EnsureDatabaseMigrated(dbContext, logger);
}

// Configure HTTP request pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Security Headers Middleware
app.Use(async (context, next) =>
{
    context.Response.Headers.Append("X-Frame-Options", "DENY");
    context.Response.Headers.Append("X-Content-Type-Options", "nosniff");
    context.Response.Headers.Append("X-XSS-Protection", "1; mode=block");
    context.Response.Headers.Append("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseCors("AllowAll");
app.UseDefaultFiles(new DefaultFilesOptions { FileProvider = app.Environment.WebRootFileProvider });
app.UseStaticFiles(new StaticFileOptions { FileProvider = app.Environment.WebRootFileProvider });
app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.MapFallback(async context =>
{
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        context.Response.ContentType = "application/json; charset=utf-8";
        await context.Response.WriteAsJsonAsync(new
        {
            statusCode = 404,
            message = $"API endpoint '{context.Request.Path}' not found.",
            error = "NotFound"
        });
        return;
    }

    var indexPath = Path.Combine(app.Environment.WebRootPath, "index.html");
    if (File.Exists(indexPath))
    {
        context.Response.ContentType = "text/html; charset=utf-8";
        await context.Response.SendFileAsync(indexPath);
    }
    else
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        await context.Response.WriteAsync("Application index.html not found.");
    }
});

app.Run();
