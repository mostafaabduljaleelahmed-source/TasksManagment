using Xunit;
using Platform.Application.Common.Utils;
using Platform.Application.Common.Interfaces;

namespace Platform.UnitTests;

public class GradingStrategyTests
{
    [Theory]
    [InlineData("Mostafa", "Mostfa", 85.7)] // Levenshtein similarity calculation
    [InlineData("Hello", "Hello", 100.0)]
    [InlineData("Hello", "World", 0.0)]
    public void TestLevenshteinSimilarity(string s, string t, double expectedMinSimilarity)
    {
        double similarity = SimilarityCalculator.GetSimilarityPercentage(s, t);
        Assert.True(similarity >= expectedMinSimilarity, $"Expected similarity of '{s}' and '{t}' to be >= {expectedMinSimilarity}%, but got {similarity}%");
    }

    [Fact]
    public void TestEducationalGradingStrategyPartialScore()
    {
        var strategy = new EducationalGradingStrategy();
        
        // Expected outputs (2 lines, weight = 5)
        var expected = "Hello\nWorld";
        var actual = "Hello\nWord"; // Minor typo on line 2
        
        var result = strategy.Grade(expected, actual, 5.0, true);
        
        // Line 1 is 100% correct, Line 2 has minor typo (80% similar: Word vs World)
        // Line weight: 2.5. Score = 2.5 + (2.5 * 0.8) = 2.5 + 2.0 = 4.5
        Assert.Equal(4.5, result.TotalScore);
        Assert.Equal(1, result.PassedLinesCount);
        Assert.Equal(2, result.TotalLinesCount);
        Assert.Equal(2, result.LineDetails.Count);
        Assert.True(result.LineDetails[0].IsCorrect);
        Assert.False(result.LineDetails[1].IsCorrect);
        Assert.Equal(80.0, result.LineDetails[1].SimilarityPercentage);
        Assert.Equal(2.0, result.LineDetails[1].PointsEarned);
    }

    [Fact]
    public void TestExactGradingStrategyStrictScore()
    {
        var strategy = new ExactGradingStrategy();
        
        var expected = "Hello\nWorld";
        var actual = "Hello\nWord";
        
        var result = strategy.Grade(expected, actual, 5.0, true);
        
        Assert.Equal(0.0, result.TotalScore);
        Assert.Equal(0, result.PassedLinesCount);
        Assert.False(result.LineDetails[0].IsCorrect);
    }
}
