import React from 'react';
import { getScoreColorStyle } from '../utils/scoreColor';

interface ScoreBadgeProps {
  score: number;
  maxScore?: number;
  showPercentage?: boolean;
  className?: string;
}

export const ScoreBadge: React.FC<ScoreBadgeProps> = ({
  score,
  maxScore = 100,
  showPercentage = false,
  className = '',
}) => {
  const config = getScoreColorStyle(score, maxScore);

  return (
    <span
      className={`px-2.5 py-0.5 rounded-lg text-xs font-bold font-mono inline-flex items-center gap-1 ${config.badgeStyle} ${className}`}
    >
      <span>
        {score}/{maxScore}
      </span>
      {showPercentage && <span className="text-[10px] opacity-80">({Math.round(config.percentage)}%)</span>}
    </span>
  );
};
