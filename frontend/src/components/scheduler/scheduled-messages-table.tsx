"use client";

import { Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ScheduledMessageStatusBadge } from "./scheduled-message-status-badge";
import type { ScheduledMessage } from "@/lib/types/scheduler";

interface ScheduledMessagesTableProps {
  messages: ScheduledMessage[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onCancel: (id: string) => void;
  isCancelling: boolean;
  onPageChange: (page: number) => void;
  onCreateClick: () => void;
}

function formatScheduledAt(dateStr: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: timezone,
    }).format(new Date(dateStr));
  } catch {
    return new Date(dateStr).toLocaleString();
  }
}

function truncateBody(body: string | null, max = 60): string {
  if (!body) return "—";
  return body.length > max ? body.slice(0, max) + "…" : body;
}

export function ScheduledMessagesTable({
  messages,
  total,
  take,
  skip,
  isLoading,
  onCancel,
  isCancelling,
  onPageChange,
  onCreateClick,
}: ScheduledMessagesTableProps) {
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
              <div className="h-3.5 w-32 rounded bg-surface-container animate-pulse" />
              <div className="h-3 w-48 rounded bg-surface-container animate-pulse" />
            </div>
            <div className="h-5 w-16 rounded-full bg-surface-container animate-pulse" />
            <div className="h-3.5 w-20 rounded bg-surface-container animate-pulse" />
            <div className="h-3.5 w-36 rounded bg-surface-container animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-12 w-12" />}
        title="No scheduled messages"
        description="Schedule your first message to send it automatically at a specific time."
        actionLabel="Schedule Message"
        onAction={onCreateClick}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="grid grid-cols-[1fr_100px_80px_160px_60px] gap-2 px-4 py-2.5 text-[11px] font-medium text-on-surface-variant uppercase tracking-wide border-b border-outline-variant/15">
        <span>Message</span>
        <span>Contact</span>
        <span>Status</span>
        <span>Scheduled At</span>
        <span />
      </div>

      {/* Rows */}
      {messages.map((msg) => (
        <div
          key={msg.id}
          className="grid grid-cols-[1fr_100px_80px_160px_60px] gap-2 items-center px-4 py-3.5 border-b border-outline-variant/10 hover:bg-surface-container-low transition-colors"
        >
          {/* Message preview */}
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-on-surface truncate">
              {truncateBody(msg.messageBody)}
            </p>
            <p className="text-[11px] text-on-surface-variant/60">
              {msg.messageType}
            </p>
          </div>

          {/* Contact phone */}
          <span className="text-[12px] text-on-surface-variant truncate">
            {msg.contactPhone}
          </span>

          {/* Status */}
          <div>
            <ScheduledMessageStatusBadge status={msg.status} />
          </div>

          {/* Scheduled at */}
          <span className="text-[12px] text-on-surface-variant tabular-nums">
            {formatScheduledAt(msg.scheduledAt, msg.timezone)}
          </span>

          {/* Cancel action */}
          <div className="flex justify-center">
            {msg.status === "PENDING" && (
              <button
                onClick={() => onCancel(msg.id)}
                disabled={isCancelling}
                className="p-1.5 rounded-lg text-on-surface-variant/40 hover:text-error hover:bg-error/10 transition-colors disabled:opacity-50"
                title="Cancel message"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      ))}

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
