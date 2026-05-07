"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type {
  CampaignRecipient,
  CampaignRecipientStatus,
} from "@/lib/types/campaigns";

const RECIPIENT_STATUS_CONFIG: Record<
  CampaignRecipientStatus,
  { label: string; variant: "default" | "primary" | "success" | "warning" | "error" | "muted" }
> = {
  PENDING: { label: "Pending", variant: "muted" },
  QUEUED: { label: "Queued", variant: "default" },
  SENT: { label: "Sent", variant: "primary" },
  DELIVERED: { label: "Delivered", variant: "success" },
  FAILED: { label: "Failed", variant: "error" },
  SKIPPED: { label: "Skipped", variant: "muted" },
};

interface RecipientsTableProps {
  recipients: CampaignRecipient[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function CampaignRecipientsTable({
  recipients,
  total,
  take,
  skip,
  isLoading,
  onPageChange,
}: RecipientsTableProps) {
  const currentPage = Math.floor(skip / take);
  const totalPages = Math.ceil(total / take);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  if (recipients.length === 0) {
    return (
      <p className="text-center text-[13px] text-on-surface-variant/60 py-8">
        No recipients yet.
      </p>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_120px_90px_100px] gap-2 px-4 py-2 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide border-b border-outline-variant/15">
        <span>Contact</span>
        <span>Phone</span>
        <span>Status</span>
        <span>Processed</span>
      </div>

      {/* Rows */}
      {recipients.map((r) => {
        const cfg = RECIPIENT_STATUS_CONFIG[r.status];
        return (
          <div
            key={r.id}
            className="grid grid-cols-[1fr_120px_90px_100px] gap-2 items-center px-4 py-2.5 border-b border-outline-variant/10"
          >
            <span className="text-[13px] text-on-surface truncate">
              {r.contact?.name || "Unknown"}
            </span>
            <span className="text-[12px] text-on-surface-variant/60 tabular-nums">
              {r.contactPhone}
            </span>
            <Badge variant={cfg.variant}>{cfg.label}</Badge>
            <span className="text-[11px] text-on-surface-variant/60">
              {r.processedAt
                ? new Date(r.processedAt).toLocaleTimeString()
                : "—"}
            </span>
          </div>
        );
      })}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-[12px] text-on-surface-variant/60">
            {skip + 1}–{Math.min(skip + take, total)} of {total}
          </p>
          <div className="flex gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 0}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
