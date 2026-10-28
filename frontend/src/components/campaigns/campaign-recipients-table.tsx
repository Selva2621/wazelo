"use client";

import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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

function processedTime(r: CampaignRecipient): string {
  return r.processedAt ? new Date(r.processedAt).toLocaleTimeString() : "—";
}

const columns: DataTableColumn<CampaignRecipient>[] = [
  {
    id: "contact",
    header: "Contact",
    cell: (r) => (
      <span className="block truncate text-body text-on-surface">
        {r.contact?.name || "Unknown"}
      </span>
    ),
  },
  {
    id: "phone",
    header: "Phone",
    className: "w-[120px]",
    cellClassName: "text-label text-on-surface-variant/60 tabular-nums",
    cell: (r) => r.contactPhone,
  },
  {
    id: "status",
    header: "Status",
    className: "w-[90px]",
    skeleton: "badge",
    cell: (r) => {
      const cfg = RECIPIENT_STATUS_CONFIG[r.status];
      return <Badge dot variant={cfg.variant}>{cfg.label}</Badge>;
    },
  },
  {
    id: "processed",
    header: "Processed",
    className: "w-[100px]",
    skeleton: "short",
    cellClassName: "text-caption text-on-surface-variant/60",
    cell: processedTime,
  },
];

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
  return (
    <DataTable
      label="Recipients"
      columns={columns}
      rows={recipients}
      rowKey={(r) => r.id}
      rowLabel={(r) => r.contact?.name || r.contactPhone}
      loading={isLoading}
      skeletonRows={6}
      pagination={{ page: Math.floor(skip / take), pageSize: take, total, onPageChange }}
      empty={{
        icon: <Users className="h-10 w-10" />,
        title: "No recipients yet",
        compact: true,
      }}
      // Phones: name + status on top, phone + processed time below
      renderMobileRow={(r) => {
        const cfg = RECIPIENT_STATUS_CONFIG[r.status];
        return (
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-0.5 px-4 py-2.5">
            <span className="text-body text-on-surface truncate">
              {r.contact?.name || "Unknown"}
            </span>
            <Badge dot variant={cfg.variant} className="justify-self-end">{cfg.label}</Badge>
            <span className="text-label text-on-surface-variant/60 tabular-nums">
              {r.contactPhone}
            </span>
            <span className="text-caption text-on-surface-variant/60 text-right">
              {processedTime(r)}
            </span>
          </div>
        );
      }}
    />
  );
}
