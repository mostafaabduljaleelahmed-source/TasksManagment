# Build Stage
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Copy csproj files and restore dependencies
COPY ["backend/Platform.Api/Platform.Api.csproj", "backend/Platform.Api/"]
COPY ["backend/Platform.Application/Platform.Application.csproj", "backend/Platform.Application/"]
COPY ["backend/Platform.Domain/Platform.Domain.csproj", "backend/Platform.Domain/"]
COPY ["backend/Platform.Infrastructure/Platform.Infrastructure.csproj", "backend/Platform.Infrastructure/"]

RUN dotnet restore "backend/Platform.Api/Platform.Api.csproj"

# Copy full project source and publish
COPY . .
WORKDIR "/src/backend/Platform.Api"
RUN dotnet publish "Platform.Api.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Final Runtime Stage
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Install Python 3 for local code execution support
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/publish .

# Dynamically bind to Render's PORT environment variable
ENV ASPNETCORE_URLS=http://+:${PORT:-8080}
EXPOSE 8080

ENTRYPOINT ["dotnet", "Platform.Api.dll"]
