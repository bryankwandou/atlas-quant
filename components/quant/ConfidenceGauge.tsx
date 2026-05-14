'use client';

interface ConfidenceGaugeProps {
  value: number;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function ConfidenceGauge({ value, label = 'Confidence', size = 'md' }: ConfidenceGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const color = clampedValue >= 80 ? 'var(--buy)' : clampedValue >= 60 ? 'var(--accent)' : clampedValue >= 40 ? 'var(--neutral)' : 'var(--sell)';
  const radius = size === 'lg' ? 36 : size === 'md' ? 28 : 20;
  const strokeWidth = size === 'lg' ? 4 : 3;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  const svgSize = (radius + strokeWidth + 2) * 2;
  const fontSize = size === 'lg' ? 14 : size === 'md' ? 11 : 9;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={svgSize} height={svgSize}>
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none" stroke="var(--border)" strokeWidth={strokeWidth}
        />
        <circle
          cx={svgSize / 2} cy={svgSize / 2} r={radius}
          fill="none" stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 0.5s ease' }}
        />
        <text
          x="50%" y="50%"
          textAnchor="middle" dominantBaseline="central"
          style={{ fontSize, fontFamily: 'monospace', fontWeight: 600, fill: color }}
        >
          {clampedValue}
        </text>
      </svg>
      {label && <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{label}</span>}
    </div>
  );
}
