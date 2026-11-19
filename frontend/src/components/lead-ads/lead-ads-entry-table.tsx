"use client";

import { useMemo } from "react";
import Link from "next/link";
import { RefreshCw, Target, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { LeadAdSourceBadge } from "./lead-ads-source-badge";
import { LEAD_AD_STATUS_LABELS } from "@/lib/types/lead-ads";
import type { LeadAdEntry, LeadAdStatus } from "@/lib/types/lead-ads";

interface LeadAdsEntryTableProps {
  entries: LeadAdEntry[];
  onRetry?: (id: string) => void;
  isRetrying?: boolean;
}

const statusVariant: Record<LeadAdStatus, "success" | "warning" | "error" | "info"> = {
  PENDING: "warning",
  PROCESSING: "info",
  COMPLETED: "success",
  FAILED: "error",
};

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function extractContactInfo(entry: LeadAdEntry): { name: string; phone: string; email: string } {
  const parsed = (entry.leadData as Record<string, unknown>)?.parsed as Record<string, unknown> | undefined;
  return {
    name: (parsed?.fullName as string) || (parsed?.firstName as string) || "—",
    phone: (parsed?.phone as string) || "—",
    email: (parsed?.email as string) || "—",
  };
}

export function LeadAdsEntryTable({
  entries,
  onRetry,
  isRetrying,
}: LeadAdsEntryTableProps) {
  const columns = useMemo<DataTableColumn<LeadAdEntry>[]>(
    () => [
      {
        id: "source",
        header: "Source",
        skeleton: "badge",
        cell: (entry) => <LeadAdSourceBadge platform={entry.platform} />,
      },
      {
        id: "contact",
        header: "Contact",
        cell: (entry) => {
          const contact = extractContactInfo(entry);
          return (
            <>
              <p className="text-body font-medium text-on-surface">
                {contact.name}
              </p>
              <p className="text-caption text-on-surface-variant/60">
                {contact.phone !== "—" ? contact.phone : contact.email}
              </p>
            </>
          );
        },
      },
      {
        id: "campaign",
        header: "Campaign / Ad",
        cell: (entry) => (
          <>
            <p className="text-body text-on-surface truncate max-w-[200px]">
              {entry.campaignName || "—"}
            </p>
            {entry.adName && (
              <p className="text-caption text-on-surface-variant/60 truncate max-w-[200px]">
                {entry.adName}
              </p>
            )}
          </>
        ),
      },
      {
        id: "status",
        header: "Status",
        skeleton: "badge",
        cell: (entry) => (
          <>
            <Badge dot variant={statusVariant[entry.status]}>
              {LEAD_AD_STATUS_LABELS[entry.status]}
            </Badge>
            {entry.errorMessage && (
              <Tooltip content={entry.errorMessage} side="bottom">
                <p className="text-caption text-error mt-1 truncate max-w-[160px] cursor-help">
                  {entry.errorMessage}
                </p>
              </Tooltip>
            )}
          </>
        ),
      },
      {
        id: "received",
        header: "Received",
        skeleton: "short",
        cellClassName: "text-label text-on-surface-variant",
        cell: (entry) => formatTimeAgo(entry.createdAt),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        skeleton: "none",
        cell: (entry) => (
          <div className="flex items-center justify-end gap-1">
            {entry.contactId && (
              <Tooltip content="View contact" side="left">
                <Link href={`/contacts?id=${entry.contactId}`}>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </Tooltip>
            )}
            {entry.status === "FAILED" && onRetry && (
              <Tooltip content={`Retry (${entry.retryCount}/3 attempts)`} side="left">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRetry(entry.id)}
                  disabled={isRetrying}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
                </Button>
              </Tooltip>
            )}
          </div>
        ),
      },
    ],
    [onRetry, isRetrying],
  );

  return (
    <div>
      {entries.length > 0 && (
        <div className="px-5 py-3 border-b border-outline-variant/10">
          <h3 className="text-body font-medium text-on-surface-variant">
            Lead Entries
            <span className="ml-2 text-caption text-on-surface-variant/50">
              {entries.length} result{entries.length !== 1 ? "s" : ""}
            </span>
          </h3>
        </div>
      )}

      <DataTable
        label="Lead entries"
        columns={columns}
        rows={entries}
        rowKey={(entry) => entry.id}
        rowLabel={(entry) => extractContactInfo(entry).name}
        empty={{
          icon: <Target className="h-12 w-12" />,
          title: "No leads found",
          description: "Leads from your social ad campaigns will appear here in real-time. Try adjusting your filters.",
        }}
      />
    </div>
  );
}
