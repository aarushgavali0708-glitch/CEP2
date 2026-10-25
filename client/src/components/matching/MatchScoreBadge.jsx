import React from 'react';

/**
 * MatchScoreBadge
 * Circular score ring with token-based contrast tiers.
 */
export default function MatchScoreBadge({ score = 0, size = 'md', showLabel = true }) {
  const numericScore = Math.min(Math.max(Math.round(score), 0), 100);

  const isStrong = numericScore >= 75;
  const isLow = numericScore < 50;
  const ringClass = isStrong
    ? 'stroke-accent'
    : isLow
    ? 'stroke-secondary'
    : 'stroke-accent opacity-65';

  const dimensions = {
    sm: { width: 44, height: 44, radius: 18, strokeWidth: 3, textSize: 'text-xs' },
    md: { width: 60, height: 60, radius: 25, strokeWidth: 4, textSize: 'text-sm' },
    lg: { width: 84, height: 84, radius: 36, strokeWidth: 5, textSize: 'text-xl' },
  }[size] || { width: 60, height: 60, radius: 25, strokeWidth: 4, textSize: 'text-sm' };

  const circumference = 2 * Math.PI * dimensions.radius;
  const strokeDashoffset = circumference - (numericScore / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center rounded-full">
        <svg
          width={dimensions.width}
          height={dimensions.height}
          className="transform -rotate-90"
        >
          {/* Background circle */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.height / 2}
            r={dimensions.radius}
            className="stroke-border"
            strokeWidth={dimensions.strokeWidth}
            fill="transparent"
          />
          {/* Animated score stroke */}
          <circle
            cx={dimensions.width / 2}
            cy={dimensions.height / 2}
            r={dimensions.radius}
            className={`${ringClass} transition-all duration-700 ease-out`}
            strokeWidth={dimensions.strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        {/* Center score number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`font-heading font-semibold ${dimensions.textSize} text-ivory`}>
            {numericScore}%
          </span>
        </div>
      </div>

      {showLabel && (
          <span className="mt-1 text-xs font-medium text-secondary">
            {isStrong ? 'Strong match' : isLow ? 'Low match' : 'Good match'}
        </span>
      )}
    </div>
  );
}
