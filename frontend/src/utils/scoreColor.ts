export interface ScoreColorConfig {
  percentage: number;
  textColor: string;
  bgColor: string;
  borderColor: string;
  badgeStyle: string;
  progressColor: string;
  label: string;
}

export function calculateGradePercentage(score: number, maxScore: number = 100): number {
  if (maxScore <= 0) return 0;
  const pct = (score / maxScore) * 100;
  return Math.min(100, Math.max(0, Math.round(pct * 10) / 10));
}

export function getScoreColorStyle(score: number, maxScore: number = 100): ScoreColorConfig {
  const percentage = calculateGradePercentage(score, maxScore);

  if (percentage < 25) {
    return {
      percentage,
      textColor: 'text-red-400',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      badgeStyle: 'text-red-400 bg-red-500/10 border border-red-500/30',
      progressColor: 'bg-red-500',
      label: 'Needs Work',
    };
  }
  if (percentage < 50) {
    return {
      percentage,
      textColor: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      badgeStyle: 'text-orange-400 bg-orange-500/10 border border-orange-500/30',
      progressColor: 'bg-orange-500',
      label: 'Developing',
    };
  }
  if (percentage < 75) {
    return {
      percentage,
      textColor: 'text-yellow-400',
      bgColor: 'bg-yellow-500/10',
      borderColor: 'border-yellow-500/30',
      badgeStyle: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/30',
      progressColor: 'bg-yellow-500',
      label: 'Satisfactory',
    };
  }
  if (percentage < 90) {
    return {
      percentage,
      textColor: 'text-lime-400',
      bgColor: 'bg-lime-500/10',
      borderColor: 'border-lime-500/30',
      badgeStyle: 'text-lime-400 bg-lime-500/10 border border-lime-500/30',
      progressColor: 'bg-lime-500',
      label: 'Good',
    };
  }
  return {
    percentage,
    textColor: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    badgeStyle: 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30',
    progressColor: 'bg-emerald-500',
    label: 'Excellent',
  };
}
