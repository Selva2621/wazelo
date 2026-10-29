import { cn } from "@/lib/utils";

interface UsageMeterProps {
  label: string;
  current: number;
  /** 0 or less means unlimited */
  limit: number;
  /** Bought on top of the plan (AI credits): with some left, a full plan isn't a blocker */
  extra?: number;
}

/** One usage line: label, used / limit and a thin bar. Sits inside a card, not a card itself. */
export function UsageMeter({ label, current, limit, extra = 0 }: UsageMeterProps) {
  const unlimited = limit <= 0;
  const pct = unlimited ? 0 : Math.min(Math.round((current / limit) * 100), 100);
  const full = !unlimited && pct >= 100 && extra === 0;
  const near = !unlimited && pct >= 80 && extra === 0 && !full;
  const valueText = unlimited
    ? `${current.toLocaleString("en-IN")} used, unlimited`
    : `${current.toLocaleString("en-IN")} of ${limit.toLocaleString("en-IN")} used`;

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate text-label text-on-surface-variant">{label}</span>
        {full && <span className="text-caption font-medium text-error">At limit</span>}
        {near && <span className="text-caption font-medium text-warning">{pct}%</span>}
      </div>
      <p className="tabular-nums text-on-surface">
        <span className="text-title-sm font-semibold">{current.toLocaleString("en-IN")}</span>
        <span className="text-label text-on-surface-variant"> / {unlimited ? "∞" : limit.toLocaleString("en-IN")}</span>
        {extra > 0 && (
          <span className="ml-1.5 text-caption font-medium text-success">+{extra.toLocaleString("en-IN")} extra</span>
        )}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={valueText}
        className="h-1 overflow-hidden rounded-full bg-surface-container-high"
      >
        <div
          className={cn(
            "grow-x h-full rounded-full",
            full ? "bg-error" : near ? "bg-warning" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
