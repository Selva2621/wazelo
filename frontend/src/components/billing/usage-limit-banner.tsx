"use client";

import { AlertTriangle, ShieldOff, ArrowUpCircle, X } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/use-billing";

type BannerLevel = "soft" | "hard" | null;

/**
 * Usage limit warning banner — designed from Stitch screens:
 * - Soft limit (80%+): amber warning bar with "Upgrade Plan" CTA
 * - Hard limit (100%): red error bar blocking actions
 *
 * Place at the top of content areas (inbox, campaigns) to alert users.
 */
export function UsageLimitBanner({
  metric,
  className,
}: {
  /** Which metric to check: "messages" | "campaigns" | "users" | "sessions" */
  metric: "messages" | "campaigns" | "users" | "sessions";
  className?: string;
}) {
  const { data: subData } = useSubscription();
  const [dismissed, setDismissed] = useState(false);
  const usage = subData?.usage;

  if (!usage || dismissed) return null;

  const metricMap = {
    messages: usage.messagesSent,
    campaigns: usage.campaignExecutions,
    users: usage.activeUsers,
    sessions: usage.whatsappSessions,
  };

  const entry = metricMap[metric];
  if (!entry) return null;

  const pct = entry.percentUsed;
  let level: BannerLevel = null;
  if (pct >= 100) level = "hard";
  else if (pct >= 80) level = "soft";

  if (!level) return null;

  const metricLabels: Record<string, string> = {
    messages: "monthly messages",
    campaigns: "monthly campaigns",
    users: "team members",
    sessions: "WhatsApp sessions",
  };

  const label = metricLabels[metric];

  if (level === "hard") {
    return (
      <div
        className={cn(
          "flex items-center gap-3 bg-error-container border-b border-error/20 px-4 py-3",
          className,
        )}
        role="alert"
      >
        <ShieldOff className="h-4.5 w-4.5 text-error shrink-0" />
        <p className="flex-1 text-[13px] text-error leading-snug">
          You&apos;ve reached your {label} limit ({entry.current.toLocaleString()}/
          {entry.limit.toLocaleString()}). Upgrade your plan to continue.
        </p>
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-error/15 px-3 py-1.5 text-[12px] font-medium text-error hover:bg-error/25 transition-colors"
        >
          <ArrowUpCircle className="h-3.5 w-3.5" />
          Upgrade Plan
        </Link>
      </div>
    );
  }

  // Soft limit
  return (
    <div
      className={cn(
        "flex items-center gap-3 bg-warning-container border-b border-warning/20 px-4 py-3",
        className,
      )}
      role="alert"
    >
      <AlertTriangle className="h-4.5 w-4.5 text-warning shrink-0" />
      <p className="flex-1 text-[13px] text-warning leading-snug">
        You&apos;ve used {pct.toFixed(0)}% of your {label} (
        {entry.current.toLocaleString()}/{entry.limit.toLocaleString()}).
        Consider upgrading.
      </p>
      <Link
        href="/settings/billing"
        className="inline-flex items-center gap-1.5 shrink-0 rounded-lg bg-warning/10 px-3 py-1.5 text-[12px] font-medium text-warning hover:bg-warning/20 transition-colors"
      >
        <ArrowUpCircle className="h-3.5 w-3.5" />
        Upgrade Plan
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 rounded text-warning/60 hover:text-warning transition-colors shrink-0"
        aria-label="Dismiss warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
