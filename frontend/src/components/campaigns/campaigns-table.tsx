"use client";

import { ChevronRight, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignProgressBar } from "./campaign-progress-bar";
import type { Campaign } from "@/lib/types/campaigns";
import { ChannelIcon } from "./email-channel";
import { actualStartAt, campaignWhen, formatInZone } from "@/lib/campaign-time";

interface CampaignsTableProps {
  campaigns: Campaign[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onRowClick: (id: string) => void;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
}

function deliveryRate(campaign: Campaign): string {
  if (campaign.sentCount === 0) return "—";
  return `${((campaign.deliveredCount / campaign.sentCount) * 100).toFixed(1)}%`;
}

const columns: DataTableColumn<Campaign>[] = [
  {
    id: "campaign",
    header: "Campaign",
    // A share of the width, so the spare room spreads over the other columns instead of
    // leaving a wide gap between the name and Status
    className: "w-[32%]",
    cell: (c) => (
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <ChannelIcon channel={c.channel} />
          <p className="truncate text-body font-medium text-on-surface">{c.name}</p>
        </div>
        {c.description && <p className="truncate text-caption text-on-surface-variant">{c.description}</p>}
      </div>
    ),
  },
  {
    id: "status",
    header: "Status",
    className: "w-28",
    skeleton: "badge",
    cell: (c) => <CampaignStatusBadge status={c.status} pulse={c.status === "RUNNING"} />,
  },
  {
    id: "recipients",
    header: "Recipients",
    className: "w-28",
    skeleton: "short",
    cellClassName: "text-label tabular-nums text-on-surface-variant",
    cell: (c) => c.totalRecipients.toLocaleString(),
  },
  {
    id: "progress",
    header: "Progress",
    className: "w-40",
    skeleton: "bar",
    cell: (c) => (
      <CampaignProgressBar
        sent={c.processedRecipientCount ?? c.sentCount + c.failedCount}
        total={c.totalRecipients}
      />
    ),
  },
  {
    id: "delivery",
    header: "Delivery",
    className: "w-24",
    skeleton: "short",
    cell: (c) => (
      <span className={cn("text-label tabular-nums", c.sentCount > 0 ? "text-success" : "text-on-surface-variant/50")}>
        {deliveryRate(c)}
      </span>
    ),
  },
  {
    id: "when",
    header: "When",
    className: "w-44",
    skeleton: "short",
    cellClassName: "text-caption text-on-surface-variant",
    cell: (c) => {
      const when = campaignWhen(c);
      const startsAt = actualStartAt(c);
      return (
        <span className="block leading-tight">
          <span className="block text-on-surface-variant/70">{when.label}</span>
          <span className="tabular-nums">{when.value}</span>
          {startsAt && (
            <span
              className="mt-0.5 block font-medium text-warning tabular-nums"
              title="Set outside sending hours: the first message goes out when they open"
            >
              Starts {formatInZone(startsAt.toISOString(), c.timezone)}
            </span>
          )}
        </span>
      );
    },
  },
];

export function CampaignsTable({
  campaigns,
  total,
  take,
  skip,
  isLoading,
  onRowClick,
  onPageChange,
  onCreateClick,
}: CampaignsTableProps) {
  return (
    <DataTable
      label="Campaigns"
      columns={columns}
      rows={campaigns}
      rowKey={(c) => c.id}
      rowLabel={(c) => c.name}
      loading={isLoading}
      skeletonRows={6}
      onRowClick={(c) => onRowClick(c.id)}
      pagination={{ page: Math.floor(skip / take), pageSize: take, total, onPageChange }}
      empty={{
        icon: <Megaphone className="h-12 w-12" />,
        title: "No campaigns found",
        description: "Create your first campaign to start sending bulk messages.",
        actionLabel: "New campaign",
        onAction: onCreateClick,
      }}
      // Phones: iOS grouped list, one row per campaign
      renderMobileRow={(c) => (
        <button
          type="button"
          onClick={() => onRowClick(c.id)}
          className="flex min-h-11 w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-container"
        >
          <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex items-center gap-2">
              <ChannelIcon channel={c.channel} />
              <p className="min-w-0 flex-1 truncate text-body font-medium text-on-surface">{c.name}</p>
              <CampaignStatusBadge status={c.status} pulse={c.status === "RUNNING"} />
            </div>
            {c.description && <p className="truncate text-caption text-on-surface-variant/70">{c.description}</p>}
            <CampaignProgressBar
              sent={c.processedRecipientCount ?? c.sentCount + c.failedCount}
              total={c.totalRecipients}
            />
            <p className="text-caption text-on-surface-variant">
              {c.totalRecipients.toLocaleString()} recipients
              {c.sentCount > 0 && (
                <>
                  {" · "}
                  <span className="text-success">{deliveryRate(c)} delivered</span>
                </>
              )}
              {" · "}
              {(() => {
                const when = campaignWhen(c);
                return when.label === "Created" ? when.value : `${when.label} ${when.value}`;
              })()}
              {(() => {
                const startsAt = actualStartAt(c);
                return startsAt ? (
                  <span className="font-medium text-warning"> · starts {formatInZone(startsAt.toISOString(), c.timezone)}</span>
                ) : null;
              })()}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant/50" aria-hidden />
        </button>
      )}
    />
  );
}
