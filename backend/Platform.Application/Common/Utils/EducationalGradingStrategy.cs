using System;
using System.Collections.Generic;
using System.Text.RegularExpressions;
using Platform.Application.Common.Interfaces;

namespace Platform.Application.Common.Utils;

public class EducationalGradingStrategy : IGradingStrategy
{
    public LineByLineGradingResult Grade(string expected, string actual, double maxGrade, bool ignoreMultipleSpaces)
    {
        var expectedNorm = OutputNormalizer.Normalize(expected);
        var actualNorm = OutputNormalizer.Normalize(actual);

        var expectedLines = string.IsNullOrEmpty(expectedNorm) ? Array.Empty<string>() : expectedNorm.Split('\n');
        var actualLines = string.IsNullOrEmpty(actualNorm) ? Array.Empty<string>() : actualNorm.Split('\n');

        var result = new LineByLineGradingResult
        {
            TotalLinesCount = expectedLines.Length,
            TotalScore = 0.0,
            PassedLinesCount = 0
        };

        if (expectedLines.Length == 0)
        {
            result.TotalScore = maxGrade;
            result.PassedLinesCount = 0;
            result.FeedbackSummary = "No output expected.";
            return result;
        }

        double lineWeight = maxGrade / expectedLines.Length;

        for (int i = 0; i < expectedLines.Length; i++)
        {
            var expLine = expectedLines[i];
            
            if (ignoreMultipleSpaces)
            {
                expLine = Regex.Replace(expLine, @"[ \t]+", " ");
            }

            if (i < actualLines.Length)
            {
                var actLine = actualLines[i];
                if (ignoreMultipleSpaces)
                {
                    actLine = Regex.Replace(actLine, @"[ \t]+", " ");
                }

                double similarity = SimilarityCalculator.GetSimilarityPercentage(expLine, actLine);
                double points = lineWeight * (similarity / 100.0);
                
                // Keep points positive and rounded
                points = Math.Max(0.0, Math.Round(points, 2));
                bool isCorrect = similarity >= 99.0;
                if (isCorrect)
                {
                    result.PassedLinesCount++;
                }

                result.TotalScore += points;

                result.LineDetails.Add(new LineGradingDetails
                {
                    LineNumber = i + 1,
                    Expected = expectedLines[i], // Show raw normalized line
                    Actual = actualLines[i],
                    SimilarityPercentage = Math.Round(similarity, 1),
                    PointsEarned = points,
                    MaxPoints = Math.Round(lineWeight, 2),
                    IsCorrect = isCorrect
                });
            }
            else
            {
                // Missing line
                result.LineDetails.Add(new LineGradingDetails
                {
                    LineNumber = i + 1,
                    Expected = expectedLines[i],
                    Actual = string.Empty,
                    SimilarityPercentage = 0.0,
                    PointsEarned = 0.0,
                    MaxPoints = Math.Round(lineWeight, 2),
                    IsCorrect = false
                });
            }
        }

        result.TotalScore = Math.Min(maxGrade, Math.Round(result.TotalScore, 2));

        // Format summary feedback
        if (result.PassedLinesCount == result.TotalLinesCount)
        {
            result.FeedbackSummary = "Perfect! All lines correct.";
        }
        else
        {
            result.FeedbackSummary = $"Graded: {result.PassedLinesCount}/{result.TotalLinesCount} lines correct. Points: {result.TotalScore}/{maxGrade}";
        }

        return result;
    }
}
