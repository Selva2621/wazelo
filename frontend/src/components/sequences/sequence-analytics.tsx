"use client";

import { Users, CheckCircle2, LogOut, MessageSquare, Clock, Activity } from "lucide-react";
import { useSequenceAnalytics, useSequenceRecipients } from "@/hooks/use-sequences";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import type { SequenceRecipient, SequenceRecipientStatus } from "@/lib/types/sequences";

interface SequenceAnalyticsProps {
  sequenceId: string;
  onClose?: () => void;
  /** Which parts to render (default: all). The details page places the stats and the rest separately. */
  show?: { stats?: boolean; insights?: boolean; recipients?: boolean };
}

const RECIPIENT_STATUS_VARIANTS: Record<SequenceRecipientStatus, "success" | "info" | "warning" | "error"> = {
  ACTIVE: "success",
  COMPLETED: "info",
  EXITED: "warning",
  PAUSED: "error",
};

const RECIPIENT_STATUS_LABELS: Record<SequenceRecipientStatus, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  EXITED: "Exited",
  PAUSED: "Paused",
};

const recipientColumns: DataTableColumn<SequenceRecipient>[] = [
  {
    id: "contact",
    header: "Contact",
    cell: (r) => (
      <>
        <p className="text-body font-medium text-on-surface">
          {r.contact.name || r.contact.phoneNumber}
        </p>
        {r.contact.name && (
          <p className="text-caption text-on-surface-variant/60">{r.contact.phoneNumber}</p>
        )}
      </>
    ),
  },
  {
    id: "status",
    header: "Status",
    skeleton: "badge",
    cell: (r) => <Badge dot variant={RECIPIENT_STATUS_VARIANTS[r.status]}>{RECIPIENT_STATUS_LABELS[r.status]}</Badge>,
  },
  {
    id: "currentStep",
    header: "Current Step",
    skeleton: "short",
    cellClassName: "text-label text-on-surface-variant",
    cell: (r) => `Step ${r.currentStep + 1}`,
  },
  {
    id: "enrolled",
    header: "Enrolled",
    skeleton: "short",
    cellClassName: "text-caption text-on-surface-variant",
    cell: (r) => new Date(r.enrolledAt).toLocaleDateString(),
  },
];

export function SequenceAnalytics({ sequenceId, show }: SequenceAnalyticsProps) {
  const showStats = show?.stats ?? true;
  const showInsights = show?.insights ?? true;
  const showRecipients = show?.recipients ?? true;
  const { data, isLoading } = useSequenceAnalytics(sequenceId);
  const { data: recipientsData, isLoading: recipientsLoading } = useSequenceRecipients(sequenceId);

  if (isLoading) {
    if (!showStats) return null;
    // Skeleton tiles in the same grid, so the layout doesn't jump when data arrives
    return (
      <div aria-busy="true" aria-label="Loading analytics" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={cn(CARD, "space-y-3 p-4")}>
            <div className="h-3 w-20 animate-pulse rounded bg-surface-container" />
            <div className="h-6 w-12 animate-pulse rounded bg-surface-container" />
          </div>
        ))}
      </div>
    );
  }
  if (!data) {
    return <p className="py-8 text-center text-body text-on-surface-variant">No analytics yet for this sequence.</p>;
  }

  const firstReached = data.stepFunnel[0]?.reached ?? 0;
  const maxReached = Math.max(...data.stepFunnel.map((s) => s.reached), 1);
  const avgCompletion =
    data.avgCompletionHours === null
      ? null
      : data.avgCompletionHours < 24
        ? `${data.avgCompletionHours}h`
        : `${Math.round((data.avgCompletionHours / 24) * 10) / 10} days`;

  return (
    <div className="space-y-6">
      {/* Summary: every headline number in one row of tiles */}
      {showStats && (
      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard icon={Users} label="Recipients" value={data.totalRecipients} color="text-primary" />
        <StatCard icon={Activity} label="Active" value={data.activeCount} color="text-success" />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completedCount} color="text-info" />
        <StatCard icon={LogOut} label="Exited" value={data.exitedCount} color="text-warning" />
        <StatCard icon={MessageSquare} label="Reply rate" value={`${data.replyRate}%`} color="text-info" />
        <StatCard icon={Clock} label="Avg. time to finish" value={avgCompletion ?? "—"} color="text-on-surface-variant" />
      </div>
      )}

      {showInsights && (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        {/* Message funnel: how many contacts each message reached */}
        {data.stepFunnel.length > 0 && (
          <section aria-labelledby="funnel-title" className={cn(CARD, "p-5")}>
            <h2 id="funnel-title" className="mb-4 text-title-sm font-semibold text-on-surface">
              Message funnel
            </h2>
            <ol className="space-y-3">
              {data.stepFunnel.map((step) => {
                const label = step.name || `Message ${step.stepOrder + 1}`;
                const pct = firstReached > 0 ? Math.round((step.reached / firstReached) * 100) : 0;
                return (
                  <li key={step.stepOrder} className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-3 text-label">
                      <span className="min-w-0 truncate text-on-surface">
                        <span className="mr-1.5 font-medium text-on-surface-variant tabular-nums">{step.stepOrder + 1}.</span>
                        {label}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        <span className="font-semibold text-on-surface">{step.reached}</span>
                        {step.stepOrder > 0 && <span className="ml-1.5 text-on-surface-variant">{pct}%</span>}
                      </span>
                    </div>
                    {/* The bar is decorative; the numbers above carry the meaning */}
                    <div aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-container">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${(step.reached / maxReached) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {/* Why contacts left the sequence */}
        <section aria-labelledby="exits-title" className={cn(CARD, "p-5")}>
          <h2 id="exits-title" className="mb-3 text-title-sm font-semibold text-on-surface">
            Exit reasons
          </h2>
          {data.exitReasons.length > 0 ? (
            <ul className="divide-y divide-outline-variant">
              {data.exitReasons.map((er) => (
                <li key={er.reason} className="flex items-center justify-between gap-3 py-2.5 text-body">
                  <span className="text-on-surface">{sentenceCase(er.reason)}</span>
                  <span className="font-semibold tabular-nums text-on-surface">{er.count}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-body text-on-surface-variant">No one has left this sequence yet.</p>
          )}
        </section>
      </div>
      )}

      {/* Recipients */}
      {showRecipients && (
      <section aria-labelledby="recipients-title" className="space-y-3">
        <h2 id="recipients-title" className="text-title-sm font-semibold text-on-surface">
          Recipients
        </h2>
        <DataTable
          label="Recipients"
          columns={recipientColumns}
          rows={recipientsData?.data ?? []}
          rowKey={(r) => r.id}
          rowLabel={(r) => r.contact.name || r.contact.phoneNumber}
          loading={recipientsLoading}
          skeletonRows={4}
          empty={{
            icon: <Users className="h-10 w-10" />,
            title: "No recipients enrolled yet",
            compact: true,
          }}
        />
      </section>
      )}
    </div>
  );
}

const CARD = "rounded-2xl border border-outline-variant bg-surface-container-lowest";

/** "REPLIED" / "contact_replied" → "Replied" / "Contact replied" */
function sentenceCase(value: string): string {
  const s = value.replace(/[_-]+/g, " ").trim().toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className={cn(CARD, "space-y-1.5 p-4")}>
      <div className="flex items-center gap-1.5">
        <Icon aria-hidden className={cn("h-3.5 w-3.5", color)} />
        <span className="text-label text-on-surface-variant">{label}</span>
      </div>
      <p className="text-headline font-semibold tabular-nums text-on-surface">{value}</p>
    </div>
  );
}
