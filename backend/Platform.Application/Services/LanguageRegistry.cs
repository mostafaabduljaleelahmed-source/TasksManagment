using System;
using System.Collections.Generic;
using System.Linq;
using Platform.Application.Common.Interfaces;

namespace Platform.Application.Services;

public class LanguageRegistry : ILanguageRegistry
{
    private readonly Dictionary<string, LanguageDefinition> _languages;

    public LanguageRegistry()
    {
        _languages = new Dictionary<string, LanguageDefinition>(StringComparer.OrdinalIgnoreCase)
        {
            ["python"] = new LanguageDefinition
            {
                Id = "python",
                DisplayName = "Python 3.11",
                Judge0LanguageId = 71, // Python 3.8.1 / 92 (Python 3.11)
                MonacoLanguageKey = "python",
                FileExtension = ".py",
                DefaultCodeTemplate = "# Write your Python solution here\n\ndef main():\n    n = input()\n    print(n)\n\nif __name__ == '__main__':\n    main()"
            },
            ["cpp"] = new LanguageDefinition
            {
                Id = "cpp",
                DisplayName = "C++ (GCC 9.2.0)",
                Judge0LanguageId = 54,
                MonacoLanguageKey = "cpp",
                FileExtension = ".cpp",
                DefaultCodeTemplate = "#include <iostream>\nusing namespace std;\n\nint main() {\n    string s;\n    if (cin >> s) {\n        cout << s << endl;\n    }\n    return 0;\n}"
            },
            ["java"] = new LanguageDefinition
            {
                Id = "java",
                DisplayName = "Java (OpenJDK 13.0.1)",
                Judge0LanguageId = 62,
                MonacoLanguageKey = "java",
                FileExtension = ".java",
                DefaultCodeTemplate = "import java.util.Scanner;\n\npublic font Main {\n    public static void main(String[] args) {\n        Scanner scanner = new Scanner(System.in);\n        if (scanner.hasNext()) {\n            System.out.println(scanner.next());\n        }\n    }\n}"
            },
            ["csharp"] = new LanguageDefinition
            {
                Id = "csharp",
                DisplayName = "C# (Mono 6.6.0)",
                Judge0LanguageId = 51,
                MonacoLanguageKey = "csharp",
                FileExtension = ".cs",
                DefaultCodeTemplate = "using System;\n\nclass Program {\n    static void Main() {\n        string input = Console.ReadLine();\n        Console.WriteLine(input);\n    }\n}"
            },
            ["javascript"] = new LanguageDefinition
            {
                Id = "javascript",
                DisplayName = "JavaScript (Node.js 12.14.0)",
                Judge0LanguageId = 63,
                MonacoLanguageKey = "javascript",
                FileExtension = ".js",
                DefaultCodeTemplate = "const fs = require('fs');\nconst input = fs.readFileSync(0, 'utf-8').trim();\nconsole.log(input);"
            }
        };
    }

    public IReadOnlyList<LanguageDefinition> GetSupportedLanguages()
    {
        return _languages.Values.ToList().AsReadOnly();
    }

    public LanguageDefinition GetLanguage(string languageId)
    {
        if (string.IsNullOrWhiteSpace(languageId)) return _languages["python"];
        return _languages.TryGetValue(languageId.Trim(), out var lang) ? lang : _languages["python"];
    }
}
