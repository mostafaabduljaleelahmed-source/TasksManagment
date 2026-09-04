using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Platform.Application.Common.Interfaces;
using Platform.Application.Features.Tasks.Dtos;

namespace Platform.Infrastructure.Services;

public class GroqTaskGeneratorService : IAiTaskGeneratorService
{
    private readonly HttpClient _httpClient;
    private readonly IConfiguration _configuration;
    private readonly ILogger<GroqTaskGeneratorService> _logger;
    private readonly string? _apiKey;
    private readonly string _model;

    private const string GroqChatCompletionsUrl = "https://api.groq.com/openai/v1/chat/completions";

    public GroqTaskGeneratorService(HttpClient httpClient, IConfiguration configuration, ILogger<GroqTaskGeneratorService> logger)
    {
        _httpClient = httpClient;
        _configuration = configuration;
        _logger = logger;
        _apiKey = configuration["Groq:ApiKey"];
        _model = configuration["Groq:Model"] ?? "openai/gpt-oss-120b";
    }

    public async Task<List<GeneratedTaskDraftDto>> GenerateDraftsAsync(GenerateTasksRequestDto request, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(_apiKey))
        {
            throw new InvalidOperationException("AI task generation is not configured (missing Groq API key).");
        }

        if (string.IsNullOrWhiteSpace(request.Topic))
        {
            throw new ArgumentException("Topic is required to generate tasks.");
        }

        var count = Math.Clamp(request.Count, 1, 10);

        var systemPrompt =
            "You are an assistant that writes programming exercises for a coding course. " +
            "Always respond with a single JSON object of the exact shape: " +
            "{\"tasks\":[{\"title\":\"string\",\"description\":\"string (HTML allowed, plain instructions)\"," +
            "\"exampleInput\":\"string\",\"exampleOutput\":\"string\"," +
            "\"publicTestCases\":[{\"input\":\"string\",\"expectedOutput\":\"string\"}]," +
            "\"hiddenTestCases\":[{\"input\":\"string\",\"expectedOutput\":\"string\"}]}]}. " +
            "Do not include any text outside the JSON object. Provide 2-3 test cases per task.";

        var userPrompt =
            $"Generate exactly {count} distinct {request.Language} programming exercises of type '{request.Type}' " +
            $"about the topic: \"{request.Topic}\". Vary the difficulty slightly across the tasks. " +
            "Each task must be self-contained, beginner-friendly, and clearly worded.";

        var payload = new
        {
            model = _model,
            messages = new[]
            {
                new { role = "system", content = systemPrompt },
                new { role = "user", content = userPrompt }
            },
            response_format = new { type = "json_object" },
            temperature = 0.7
        };

        try
        {
            var httpRequest = new HttpRequestMessage(HttpMethod.Post, GroqChatCompletionsUrl)
            {
                Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json")
            };
            httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);

            var response = await _httpClient.SendAsync(httpRequest, cancellationToken);
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Groq HTTP {StatusCode}: {Body}", response.StatusCode, responseBody);
                throw new InvalidOperationException($"AI task generation failed (Groq returned {response.StatusCode}).");
            }

            using var doc = JsonDocument.Parse(responseBody);
            var content = doc.RootElement
                .GetProperty("choices")[0]
                .GetProperty("message")
                .GetProperty("content")
                .GetString() ?? "{}";

            using var contentDoc = JsonDocument.Parse(content);
            if (!contentDoc.RootElement.TryGetProperty("tasks", out var tasksElement) || tasksElement.ValueKind != JsonValueKind.Array)
            {
                throw new InvalidOperationException("AI response did not contain a valid task list.");
            }

            var drafts = new List<GeneratedTaskDraftDto>();
            foreach (var taskElement in tasksElement.EnumerateArray())
            {
                drafts.Add(new GeneratedTaskDraftDto
                {
                    Title = GetString(taskElement, "title"),
                    Description = GetString(taskElement, "description"),
                    ExampleInput = GetString(taskElement, "exampleInput"),
                    ExampleOutput = GetString(taskElement, "exampleOutput"),
                    PublicTestCasesJson = ExtractTestCasesJson(taskElement, "publicTestCases"),
                    HiddenTestCasesJson = ExtractTestCasesJson(taskElement, "hiddenTestCases")
                });
            }

            return drafts.Take(count).ToList();
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse Groq AI response.");
            throw new InvalidOperationException("AI task generation returned an unreadable response. Please try again.");
        }
        catch (InvalidOperationException)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error calling Groq AI task generator.");
            throw new InvalidOperationException("AI task generation failed due to a connectivity error.");
        }
    }

    private static string GetString(JsonElement element, string propertyName)
    {
        return element.TryGetProperty(propertyName, out var prop) && prop.ValueKind == JsonValueKind.String
            ? prop.GetString() ?? string.Empty
            : string.Empty;
    }

    private static string ExtractTestCasesJson(JsonElement taskElement, string propertyName)
    {
        if (!taskElement.TryGetProperty(propertyName, out var casesElement) || casesElement.ValueKind != JsonValueKind.Array)
        {
            return "[]";
        }

        var cases = new List<object>();
        foreach (var caseElement in casesElement.EnumerateArray())
        {
            cases.Add(new
            {
                input = GetString(caseElement, "input"),
                expectedOutput = GetString(caseElement, "expectedOutput")
            });
        }

        return JsonSerializer.Serialize(cases);
    }
}
