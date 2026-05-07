"use client";

interface CampaignProgressBarProps {
  sent: number;
  total: number;
  className?: string;
}

export function CampaignProgressBar({ sent, total, className = "" }: CampaignProgressBarProps) {
  const pct = total > 0 ? Math.round((sent / total) * 100) : 0;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1 rounded-full bg-surface-container overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[11px] text-on-surface-variant/60 w-8 text-right">
        {pct}%
      </span>
    </div>
  );
}
