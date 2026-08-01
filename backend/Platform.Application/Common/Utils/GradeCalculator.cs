using System;

namespace Platform.Application.Common.Utils;

public static class GradeCalculator
{
    /// <summary>
    /// Calculates the normalized grade percentage (0.0 to 100.0) based on score and task maxGrade.
    /// Returns 0 if maxGrade <= 0.
    /// </summary>
    public static double CalculatePercentage(double score, int maxGrade)
    {
        if (maxGrade <= 0) return 0.0;
        double pct = (score / maxGrade) * 100.0;
        return Math.Clamp(pct, 0.0, 100.0);
    }
}
