using System;
using System.Text.RegularExpressions;
using Platform.Application.Common.Interfaces;

namespace Platform.Application.Common.Utils;

public class ExactGradingStrategy : IGradingStrategy
{
    public LineByLineGradingResult Grade(string expected, string actual, double maxGrade, bool ignoreMultipleSpaces)
    {
        var expectedNorm = OutputNormalizer.Normalize(expected);
        var actualNorm = OutputNormalizer.Normalize(actual);

        if (ignoreMultipleSpaces)
        {
            expectedNorm = Regex.Replace(expectedNorm, @"[ \t]+", " ");
            actualNorm = Regex.Replace(actualNorm, @"[ \t]+", " ");
        }

        var isMatch = string.Equals(expectedNorm, actualNorm, StringComparison.Ordinal);

        var result = new LineByLineGradingResult
        {
            TotalScore = isMatch ? maxGrade : 0.0,
            PassedLinesCount = isMatch ? 1 : 0,
            TotalLinesCount = 1,
            FeedbackSummary = isMatch ? "Perfect! Output matches exactly." : "Exact match failed."
        };

        result.LineDetails.Add(new LineGradingDetails
        {
            LineNumber = 1,
            Expected = expectedNorm,
            Actual = actualNorm,
            SimilarityPercentage = isMatch ? 100.0 : 0.0,
            PointsEarned = result.TotalScore,
            MaxPoints = maxGrade,
            IsCorrect = isMatch
        });

        return result;
    }
}
