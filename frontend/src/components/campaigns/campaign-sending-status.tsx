"use client";

import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignAnalytics, CampaignSendingStatus } from "@/lib/types/campaigns";

const formatWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });

function Stat({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "warning" }) {
  return (
    <div className="min-w-0">
      <dt className="text-caption text-on-surface-variant">{label}</dt>
      <dd className={cn("text-body font-medium tabular-nums text-on-surface", tone === "warning" && "text-warning")}>
        {value}
      </dd>
      {hint && <dd className="text-caption text-on-surface-variant">{hint}</dd>}
    </div>
  );
}

/**
 * Where every recipient stands and what (if anything) is holding the campaign:
 * total / sent / pending / failed / held, the plan's remaining messages, and
 * each number's daily allowance when it has one.
 */
export function CampaignSendingStatusPanel({
  analytics,
  sending,
}: {
  analytics: CampaignAnalytics;
  sending: CampaignSendingStatus;
}) {
  const m = analytics.metrics;
  const pendingNotHeld = Math.max(0, m.pending + m.queued - sending.held);
  const plan = sending.plan;

  return (
    <section
      aria-label="Sending status"
      className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 max-lg:p-4"
    >
      <dl className="grid grid-cols-6 gap-4 max-lg:grid-cols-3 max-sm:grid-cols-2">
        <Stat label="Total recipients" value={String(m.totalRecipients)} />
        <Stat label="Sent" value={String(m.sent)} />
        <Stat label="Pending" value={String(pendingNotHeld)} />
        <Stat label="Failed" value={String(m.failed)} />
        <Stat
          label="Held by limits"
          value={String(sending.held)}
          tone={sending.held > 0 ? "warning" : undefined}
          hint={sending.held > 0 && sending.nextAttemptAt ? `Next try ${formatWhen(sending.nextAttemptAt)}` : undefined}
        />
        <Stat
          label="Plan messages left"
          value={!plan ? "—" : plan.limit === null ? "Unlimited" : String(plan.remaining ?? 0)}
          hint={plan && plan.limit !== null ? `${plan.used} / ${plan.limit} used` : undefined}
          tone={plan?.remaining === 0 ? "warning" : undefined}
        />
      </dl>

      {sending.numbers.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-outline-variant pt-3">
          {sending.numbers.map((n, i) => (
            <li key={n.sessionId} className="flex flex-wrap items-center gap-x-4 gap-y-1 text-label text-on-surface-variant">
              <span className="font-medium text-on-surface">
                {sending.numbers.length > 1 ? `Number ${i + 1}` : "Sending number"}
              </span>
              {n.limitMode === "plan" ? (
                <span>No daily cap · {n.bulkSentToday} sent today</span>
              ) : (
                <>
                  <span>
                    {n.limitMode === "warmup" ? `Warm-up stage ${n.warmupStage}` : "Custom daily limits"}
                  </span>
                  {n.dailyBulkCap !== null && (
                    <span className="tabular-nums">
                      Daily allowance {n.dailyBulkCap} · {n.remainingBulk ?? 0} left
                    </span>
                  )}
                  {n.dailyColdCap !== null && (
                    <span className="tabular-nums">
                      New contacts {n.coldSentToday}/{n.dailyColdCap} · {n.remainingCold ?? 0} left
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" aria-hidden /> resets {formatWhen(n.resetsAt)}
                  </span>
                </>
              )}
              {n.paused && (
                <span className="text-error">
                  Paused until {formatWhen(n.paused.until)}{n.paused.reason ? `: ${n.paused.reason}` : ""}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
