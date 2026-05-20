'use client';

interface ConfidenceGaugeProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ConfidenceGauge({ value, label = 'Confidence', size = 'md' }: ConfidenceGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const color = clampedValue >= 80 ? 'var(--tv-up)' : clampedValue >= 60 ? 'var(--tv-blue)' : clampedValue >= 40 ? 'var(--tv-neutral)' : 'var(--tv-down)';
  const radius = size === 'lg' ? 36 : size === 'md' ? 28 : 20;
  const strokeWidth = size === 'lg' ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  const svgSize = (radius + strokeWidth + 2) * 2;
  const fontSize = size === 'lg' ? 14 : size === 'md' ? 11 : 9;

  return (
    <div className="gauge-wrap">
      <svg width={svgSize} height={svgSize}>
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none" stroke="var(--tv-border)" strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="gauge-circle-progress"
        />
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="central"
          fill={color}
          fontSize={fontSize}
          className="gauge-text"
        >
          {clampedValue}
        </text>
      </svg>
      {label && <span className="gauge-label">{label}</span>}
    </div>
  );
}
