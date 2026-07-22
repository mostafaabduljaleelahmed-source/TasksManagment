using System;
using System.Text;

namespace Platform.Application.Common.Utils;

public static class OutputNormalizer
{
    public static string Normalize(string input)
    {
        if (input == null) return string.Empty;

        // 1. Normalize line endings (CRLF vs LF)
        string normalized = input.Replace("\r\n", "\n").Replace("\r", "\n");

        // 2. Trim trailing spaces on each line
        var lines = normalized.Split('\n');
        for (int i = 0; i < lines.Length; i++)
        {
            lines[i] = lines[i].TrimEnd(' ', '\t');
        }
        normalized = string.Join('\n', lines);

        // 3. Ignore one trailing newline at the end of the output
        if (normalized.EndsWith('\n'))
        {
            normalized = normalized.Substring(0, normalized.Length - 1);
        }

        return normalized;
    }

    public static string GetDiffMessage(string expected, string actual)
    {
        var expectedNorm = Normalize(expected);
        var actualNorm = Normalize(actual);

        if (expectedNorm == actualNorm)
        {
            return "No difference found (outputs match after normalization).";
        }

        var expectedLines = expectedNorm.Split('\n');
        var actualLines = actualNorm.Split('\n');

        var sb = new StringBuilder();
        sb.AppendLine("--- Difference Details ---");

        int maxLines = Math.Min(expectedLines.Length, actualLines.Length);
        bool foundDiff = false;

        for (int i = 0; i < maxLines; i++)
        {
            if (expectedLines[i] != actualLines[i])
            {
                sb.AppendLine($"Line {i + 1} mismatch:");
                sb.AppendLine($"  Expected: \"{expectedLines[i]}\"");
                sb.AppendLine($"  Actual:   \"{actualLines[i]}\"");
                int diffIdx = FindFirstDifferenceIndex(expectedLines[i], actualLines[i]);
                sb.AppendLine($"  Difference at index {diffIdx}: expected '{GetCharAt(expectedLines[i], diffIdx)}', got '{GetCharAt(actualLines[i], diffIdx)}'");
                foundDiff = true;
                break;
            }
        }

        if (!foundDiff && expectedLines.Length != actualLines.Length)
        {
            sb.AppendLine("Line count mismatch:");
            sb.AppendLine($"  Expected: {expectedLines.Length} lines");
            sb.AppendLine($"  Actual:   {actualLines.Length} lines");
            if (actualLines.Length > expectedLines.Length)
            {
                sb.AppendLine($"  Extra lines in Actual: \"{string.Join("\\n", actualLines, expectedLines.Length, actualLines.Length - expectedLines.Length)}\"");
            }
            else
            {
                sb.AppendLine($"  Missing lines in Actual (Expected): \"{string.Join("\\n", expectedLines, actualLines.Length, expectedLines.Length - actualLines.Length)}\"");
            }
        }

        return sb.ToString().TrimEnd();
    }

    private static int FindFirstDifferenceIndex(string s1, string s2)
    {
        int minLen = Math.Min(s1.Length, s2.Length);
        for (int i = 0; i < minLen; i++)
        {
            if (s1[i] != s2[i]) return i;
        }
        return minLen;
    }

    private static string GetCharAt(string s, int index)
    {
        if (index >= s.Length) return "<EOF>";
        char c = s[index];
        if (c == ' ') return "<space>";
        if (c == '\t') return "<tab>";
        return c.ToString();
    }
}
