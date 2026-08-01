using Xunit;
using Platform.Application.Common.Utils;

namespace Platform.UnitTests;

public class GradeCalculatorTests
{
    [Theory]
    [InlineData(10, 10, 100)]
    [InlineData(9, 10, 90)]
    [InlineData(8, 10, 80)]
    [InlineData(7, 10, 70)]
    [InlineData(5, 10, 50)]
    [InlineData(2, 10, 20)]
    [InlineData(1, 10, 10)]
    [InlineData(0, 10, 0)]
    [InlineData(25, 25, 100)]
    [InlineData(20, 25, 80)]
    [InlineData(15, 25, 60)]
    [InlineData(5, 25, 20)]
    [InlineData(50, 50, 100)]
    [InlineData(40, 50, 80)]
    [InlineData(25, 50, 50)]
    [InlineData(10, 50, 20)]
    [InlineData(100, 100, 100)]
    [InlineData(80, 100, 80)]
    [InlineData(60, 100, 60)]
    [InlineData(10, 100, 10)]
    public void CalculatePercentage_Scenarios_ReturnsExpectedPercentage(double score, int maxGrade, double expected)
    {
        double actual = GradeCalculator.CalculatePercentage(score, maxGrade);
        Assert.Equal(expected, actual, precision: 1);
    }
}
