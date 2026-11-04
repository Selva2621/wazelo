"use client";

import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useRecentEmails } from "@/hooks/use-email";
import type { EmailLogRow } from "@/lib/api/email";

const SOURCE: Record<EmailLogRow["source"], string> = {
  CAMPAIGN: "Campaign",
  AUTOMATION: "Automation",
  SEQUENCE: "Sequence",
  TEST: "Test",
};

const STATUS: Record<EmailLogRow["status"], { label: string; variant: "success" | "error" | "muted" | "info" }> = {
  SENT: { label: "Sent", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
  SKIPPED: { label: "Skipped", variant: "muted" },
  QUEUED: { label: "Queued", variant: "info" },
};

function when(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

/** The last 50 emails sent from the workspace address */
export function EmailSettingsRecent() {
  const { data, isLoading, isError } = useRecentEmails();

  return (
    <section data-tour="email-recent" aria-labelledby="email-recent-heading" className="space-y-2">
      <h2 id="email-recent-heading" className="text-body font-semibold text-on-surface">
        Recent emails
      </h2>
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest">
        {isLoading ? (
          <div className="grid place-items-center py-8">
            <Spinner />
          </div>
        ) : isError ? (
          <p role="alert" className="px-4 py-6 text-center text-body text-error">
            Couldn&apos;t load recent emails.
          </p>
        ) : !data || data.length === 0 ? (
          <p className="px-4 py-6 text-center text-body text-on-surface-variant">No emails yet.</p>
        ) : (
          <ul className="divide-y divide-outline-variant/60">
            {data.map((row) => {
              const s = STATUS[row.status];
              return (
                <li key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body font-medium text-on-surface">{row.subject || "(no subject)"}</p>
                    <p className="truncate text-label text-on-surface-variant">
                      {row.toAddress} · {SOURCE[row.source]}
                    </p>
                    {row.error && (row.status === "FAILED" || row.status === "SKIPPED") && (
                      <p className={row.status === "FAILED" ? "mt-0.5 text-caption text-error" : "mt-0.5 text-caption text-on-surface-variant"}>
                        {row.error}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge variant={s.variant} dot>
                      {s.label}
                    </Badge>
                    <time dateTime={row.sentAt ?? row.createdAt} className="text-caption tabular-nums text-on-surface-variant">
                      {when(row.sentAt ?? row.createdAt)}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
