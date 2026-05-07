"use client";

interface CampaignProgressRingProps {
  sent: number;
  total: number;
  size?: number;
}

export function CampaignProgressRing({
  sent,
  total,
  size = 160,
}: CampaignProgressRingProps) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;
  const strokeWidth = 8;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--color-surface-container)"
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#progress-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient
              id="progress-gradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="var(--color-primary)" />
              <stop offset="100%" stopColor="var(--color-primary-container)" />
            </linearGradient>
          </defs>
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold text-on-surface tabular-nums">
            {pct}%
          </span>
          <span className="text-[11px] text-on-surface-variant/60 tabular-nums">
            {sent.toLocaleString()} / {total.toLocaleString()}
          </span>
        </div>
      </div>
      <p className="text-[12px] text-on-surface-variant/60">
        Messages Processed
      </p>
    </div>
  );
}
