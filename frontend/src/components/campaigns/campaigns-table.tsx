"use client";

import { ChevronRight, Megaphone, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CampaignStatusBadge } from "./campaign-status-badge";
import { CampaignProgressBar } from "./campaign-progress-bar";
import type { Campaign } from "@/lib/types/campaigns";

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

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function deliveryRate(campaign: Campaign): string {
  if (campaign.sentCount === 0) return "—";
  const rate = (campaign.deliveredCount / campaign.sentCount) * 100;
  return `${rate.toFixed(1)}%`;
}

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
  const currentPage = Math.floor(skip / take);
  const totalPages = Math.ceil(total / take);

  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3.5 border-b border-outline-variant/10"
          >
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-40 rounded bg-surface-container animate-pulse" />
              <div className="h-3 w-28 rounded bg-surface-container animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-surface-container animate-pulse" />
            <div className="h-3.5 w-12 rounded bg-surface-container animate-pulse" />
            <div className="h-1 w-24 rounded bg-surface-container animate-pulse" />
            <div className="h-3.5 w-12 rounded bg-surface-container animate-pulse" />
            <div className="h-3.5 w-16 rounded bg-surface-container animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <EmptyState
        icon={<Megaphone className="h-12 w-12" />}
        title="No campaigns found"
        description="Create your first campaign to start sending bulk messages."
        actionLabel="New Campaign"
        onAction={onCreateClick}
      />
    );
  }

  return (
    <div>
      {/* Mobile: iOS grouped list, one row per campaign */}
      <ul className="lg:hidden mx-4 mt-1 mb-4 overflow-hidden rounded-xl bg-surface-container-lowest divide-y divide-outline-variant/40">
        {campaigns.map((campaign) => (
          <li key={campaign.id}>
            <button
              type="button"
              onClick={() => onRowClick(campaign.id)}
              className="flex w-full min-h-11 items-center gap-3 px-4 py-3 text-left active:bg-surface-container"
            >
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-body font-medium text-on-surface">{campaign.name}</p>
                  <CampaignStatusBadge status={campaign.status} pulse={campaign.status === "RUNNING"} />
                </div>
                {campaign.description && (
                  <p className="truncate text-caption text-on-surface-variant/70">{campaign.description}</p>
                )}
                <CampaignProgressBar sent={campaign.sentCount + campaign.failedCount} total={campaign.totalRecipients} />
                <p className="text-caption text-on-surface-variant">
                  {campaign.totalRecipients.toLocaleString()} recipients
                  {campaign.sentCount > 0 && <> · <span className="text-success">{deliveryRate(campaign)} delivered</span></>}
                  {" · "}{timeAgo(campaign.createdAt)}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant/50" aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {/* Header */}
      <div className="max-lg:hidden grid grid-cols-[1fr_90px_80px_120px_80px_80px_36px] gap-2 px-4 py-2.5 text-label font-medium text-on-surface-variant border-b border-outline-variant">
        <span>Campaign</span>
        <span>Status</span>
        <span>Recipients</span>
        <span>Progress</span>
        <span>Delivery</span>
        <span>Created</span>
        <span />
      </div>

      {/* Rows */}
      {campaigns.map((campaign) => (
        <button
          key={campaign.id}
          onClick={() => onRowClick(campaign.id)}
          className="max-lg:hidden w-full grid grid-cols-[1fr_90px_80px_120px_80px_80px_36px] gap-2 items-center px-4 py-3.5 text-left border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors cursor-pointer"
        >
          {/* Name + Description */}
          <div className="min-w-0">
            <p className="text-body font-medium text-on-surface truncate">
              {campaign.name}
            </p>
            {campaign.description && (
              <p className="text-caption text-on-surface-variant/60 truncate">
                {campaign.description}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <CampaignStatusBadge
              status={campaign.status}
              pulse={campaign.status === "RUNNING"}
            />
          </div>

          {/* Recipients */}
          <span className="text-label text-on-surface-variant tabular-nums">
            {campaign.totalRecipients.toLocaleString()}
          </span>

          {/* Progress */}
          <CampaignProgressBar
            sent={campaign.sentCount + campaign.failedCount}
            total={campaign.totalRecipients}
          />

          {/* Delivery Rate */}
          <span
            className={`text-label tabular-nums ${
              campaign.sentCount > 0 ? "text-success" : "text-on-surface-variant/40"
            }`}
          >
            {deliveryRate(campaign)}
          </span>

          {/* Created */}
          <span className="text-caption text-on-surface-variant/60">
            {timeAgo(campaign.createdAt)}
          </span>

          {/* Actions */}
          <div
            className="flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreVertical className="h-4 w-4 text-on-surface-variant/40" />
          </div>
        </button>
      ))}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-label text-on-surface-variant/60">
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
