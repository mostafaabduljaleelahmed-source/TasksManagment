using System.Collections.Generic;

namespace Platform.Application.Common.Interfaces;

public class LineGradingDetails
{
    public int LineNumber { get; set; }
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
    public double SimilarityPercentage { get; set; }
    public double PointsEarned { get; set; }
    public double MaxPoints { get; set; }
    public bool IsCorrect { get; set; }
}

public class LineByLineGradingResult
{
    public double TotalScore { get; set; }
    public int PassedLinesCount { get; set; }
    public int TotalLinesCount { get; set; }
    public string FeedbackSummary { get; set; } = string.Empty;
    public List<LineGradingDetails> LineDetails { get; set; } = new();
}

public interface IGradingStrategy
{
    LineByLineGradingResult Grade(string expected, string actual, double maxGrade, bool ignoreMultipleSpaces);
}
