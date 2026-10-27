"use client";

import { Users } from "lucide-react";
import type { TeamPerformanceResponse } from "@/lib/types/analytics";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

type TeamUser = TeamPerformanceResponse["users"][number];

const columns: DataTableColumn<TeamUser>[] = [
  {
    id: "name",
    header: "Name",
    cellClassName: "text-on-surface font-medium",
    cell: (user) => (
      <>
        {user.firstName} {user.lastName}
      </>
    ),
  },
  {
    id: "sent",
    header: "Sent",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-on-surface",
    cell: (user) => user.messagesSent.toLocaleString(),
  },
  {
    id: "received",
    header: "Received",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-on-surface-variant",
    cell: (user) => user.messagesReceived.toLocaleString(),
  },
  {
    id: "avgResponse",
    header: "Avg Response",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-on-surface-variant",
    cell: (user) => formatMs(user.avgResponseTimeMs),
  },
  {
    id: "converted",
    header: "Converted",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-success",
    cell: (user) => user.contactsConverted,
  },
  {
    id: "activeConvos",
    header: "Active Convos",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-on-surface-variant",
    cell: (user) => user.activeConversations,
  },
];

interface TeamPerformanceTableProps {
  data: TeamPerformanceResponse;
}

export function TeamPerformanceTable({ data }: TeamPerformanceTableProps) {
  const sorted = [...data.users].sort((a, b) => b.messagesSent - a.messagesSent);

  return (
    <div className="rounded-xl bg-surface-container-lowest p-5">
      <h3 className="text-title-sm font-semibold text-on-surface mb-4">
        Team Performance
      </h3>

      <DataTable
        label="Team performance"
        columns={columns}
        rows={sorted}
        rowKey={(user) => user.userId}
        rowLabel={(user) => `${user.firstName} ${user.lastName}`}
        empty={{
          icon: <Users className="h-10 w-10" />,
          title: "No team data available",
          compact: true,
        }}
      />
    </div>
  );
}
