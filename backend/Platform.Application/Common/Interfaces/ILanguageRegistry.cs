using System.Collections.Generic;

namespace Platform.Application.Common.Interfaces;

public class LanguageDefinition
{
    public string Id { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public int Judge0LanguageId { get; set; }
    public string MonacoLanguageKey { get; set; } = string.Empty;
    public string DefaultCodeTemplate { get; set; } = string.Empty;
    public string FileExtension { get; set; } = string.Empty;
}

public interface ILanguageRegistry
{
    IReadOnlyList<LanguageDefinition> GetSupportedLanguages();
    LanguageDefinition GetLanguage(string languageId);
}
