"use client";

import { cn } from "@/lib/utils";

interface CampaignKpiStripProps {
  totalRecipients: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  repliedCount?: number;
  /** Recipients finished (sent, failed or skipped) */
  processed: number;
  /** Show the progress bar (campaigns still sending or paused) */
  showProgress: boolean;
}

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/**
 * One card: progress bar + the five numbers that matter, in a single row.
 * Replaces the big progress ring and five separate cards.
 */
export function CampaignKpiStrip({
  totalRecipients,
  sentCount,
  deliveredCount: deliveredReceipts,
  readCount,
  failedCount,
  repliedCount = 0,
  processed,
  showProgress,
}: CampaignKpiStripProps) {
  // A read message was delivered even when WhatsApp skipped the delivered receipt
  const delivered = Math.max(deliveredReceipts, readCount);
  const progress = Math.min(100, pct(processed, totalRecipients));

  const metrics = [
    { label: "Recipients", value: totalRecipients, rate: null as number | null, danger: false },
    { label: "Delivered", value: delivered, rate: pct(delivered, sentCount), danger: false },
    { label: "Read", value: readCount, rate: pct(readCount, delivered), danger: false },
    { label: "Replied", value: repliedCount, rate: pct(repliedCount, delivered), danger: false },
    { label: "Failed", value: failedCount, rate: pct(failedCount, sentCount), danger: failedCount > 0 },
  ];

  return (
    <section
      aria-label="Campaign results"
      data-tour="campaign-analytics"
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 max-lg:p-4"
    >
      {showProgress && (
        <div className="mb-4">
          <div className="mb-1.5 flex items-baseline justify-between text-label text-on-surface-variant">
            <span>Progress</span>
            <span className="tabular-nums">
              <span className="font-semibold text-on-surface">{progress}%</span> · {processed.toLocaleString()} of{" "}
              {totalRecipients.toLocaleString()}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Recipients processed"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="h-2 overflow-hidden rounded-full bg-surface-container-high"
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <dl className="grid grid-cols-5 divide-x divide-outline-variant max-lg:grid-cols-3 max-lg:gap-y-3 max-lg:divide-x-0">
        {metrics.map((m) => (
          <div key={m.label} className="px-4 first:pl-0 max-lg:px-0">
            <dt className="text-label text-on-surface-variant">{m.label}</dt>
            <dd className="mt-0.5 flex items-baseline gap-1.5">
              <span className={cn("text-title font-semibold tabular-nums text-on-surface", m.danger && "text-error")}>
                {m.value.toLocaleString()}
              </span>
              {m.rate !== null && (
                <span className="text-caption tabular-nums text-on-surface-variant">{m.rate}%</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
