"use client";

import { useMemo } from "react";
import { Clock, X } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ScheduledMessageStatusBadge } from "./scheduled-message-status-badge";
import type { ScheduledMessage } from "@/lib/types/scheduler";
import { IconButton } from "@/components/ui/icon-button";

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
  const columns = useMemo<DataTableColumn<ScheduledMessage>[]>(
    () => [
      {
        id: "message",
        header: "Message",
        cell: (msg) => (
          <div className="min-w-0">
            <p className="text-body font-medium text-on-surface truncate">
              {truncateBody(msg.messageBody)}
            </p>
            <p className="text-caption text-on-surface-variant/60">
              {msg.messageType}
            </p>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Contact",
        className: "w-[100px]",
        cell: (msg) => (
          <span className="block text-label text-on-surface-variant truncate">
            {msg.contactPhone}
          </span>
        ),
      },
      {
        id: "status",
        header: "Status",
        className: "w-20",
        skeleton: "badge",
        cell: (msg) => <ScheduledMessageStatusBadge status={msg.status} />,
      },
      {
        id: "scheduledAt",
        header: "Scheduled At",
        className: "w-40",
        cellClassName: "text-label text-on-surface-variant tabular-nums",
        cell: (msg) => formatScheduledAt(msg.scheduledAt, msg.timezone),
      },
      {
        id: "actions",
        header: "Actions",
        hideHeader: true,
        align: "center",
        className: "w-[60px]",
        skeleton: "none",
        cell: (msg) =>
          msg.status === "PENDING" ? (
            <IconButton size="sm" variant="danger"
              onClick={() => onCancel(msg.id)}
              disabled={isCancelling}
              title="Cancel message" aria-label="Cancel message">
              <X className="h-4 w-4" />
            </IconButton>
          ) : null,
      },
    ],
    [onCancel, isCancelling],
  );

  return (
    <DataTable
      label="Scheduled messages"
      columns={columns}
      rows={messages}
      rowKey={(msg) => msg.id}
      rowLabel={(msg) => truncateBody(msg.messageBody)}
      loading={isLoading}
      skeletonRows={6}
      pagination={{ page: Math.floor(skip / take), pageSize: take, total, onPageChange }}
      empty={{
        icon: <Clock className="h-12 w-12" />,
        title: "No scheduled messages",
        description: "Schedule your first message to send it automatically at a specific time.",
        actionLabel: "Schedule Message",
        onAction: onCreateClick,
      }}
    />
  );
}
