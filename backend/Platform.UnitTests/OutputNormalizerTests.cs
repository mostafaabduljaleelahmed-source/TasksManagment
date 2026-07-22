using Xunit;
using Platform.Application.Common.Utils;

namespace Platform.UnitTests;

public class OutputNormalizerTests
{
    [Theory]
    [InlineData("Hello World\r\n", "Hello World")]
    [InlineData("Hello World\n", "Hello World")]
    [InlineData("Hello World", "Hello World")]
    public void TestLineEndingsAndSingleTrailingNewline(string input, string expected)
    {
        var result = OutputNormalizer.Normalize(input);
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("Hello World  \nLine Two\t \n", "Hello World\nLine Two")]
    [InlineData("Line One \r\nLine Two  ", "Line One\nLine Two")]
    public void TestTrailingSpacesPerLine(string input, string expected)
    {
        var result = OutputNormalizer.Normalize(input);
        Assert.Equal(expected, result);
    }

    [Fact]
    public void TestMultipleTrailingNewlinesOnlyRemovesOne()
    {
        var input = "Hello World\n\n";
        var result = OutputNormalizer.Normalize(input);
        Assert.Equal("Hello World\n", result);
    }

    [Fact]
    public void TestDiffMessageForMismatch()
    {
        var expected = "Hello World\nLine Two";
        var actual = "Hello Word\nLine Two";
        
        var diff = OutputNormalizer.GetDiffMessage(expected, actual);
        
        Assert.Contains("Line 1 mismatch", diff);
        Assert.Contains("Expected: \"Hello World\"", diff);
        Assert.Contains("Actual:   \"Hello Word\"", diff);
        Assert.Contains("Difference at index 9: expected 'l', got 'd'", diff);
    }

    [Fact]
    public void TestDiffMessageForLineCountMismatch()
    {
        var expected = "Hello World\nLine Two";
        var actual = "Hello World";
        
        var diff = OutputNormalizer.GetDiffMessage(expected, actual);
        
        Assert.Contains("Line count mismatch", diff);
        Assert.Contains("Expected: 2 lines", diff);
        Assert.Contains("Actual:   1 lines", diff);
    }
}
