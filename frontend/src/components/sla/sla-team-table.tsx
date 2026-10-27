"use client";

import type {
  SlaPerformanceResponse,
  SlaBreachByUser,
  SlaAvgResponseByUser,
} from "@/lib/types/sla";
import { Users } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

function formatMs(ms: number): string {
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSec}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMin = minutes % 60;
  return `${hours}h ${remainingMin}m`;
}

interface TeamRow {
  userId: string;
  name: string;
  breaches: number;
  avgMs: number;
  conversations: number;
}

function complianceRateOf(row: TeamRow): string {
  return row.conversations > 0
    ? (
        ((row.conversations - row.breaches) /
          row.conversations) *
        100
      ).toFixed(1)
    : "100.0";
}

const columns: DataTableColumn<TeamRow>[] = [
  {
    id: "name",
    header: "Name",
    cellClassName: "text-on-surface font-medium",
    cell: (row) => row.name,
  },
  {
    id: "avgResponse",
    header: "Avg Response",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-on-surface-variant",
    cell: (row) => (row.avgMs > 0 ? formatMs(row.avgMs) : "—"),
  },
  {
    id: "conversations",
    header: "Conversations",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums text-on-surface",
    cell: (row) => row.conversations,
  },
  {
    id: "breaches",
    header: "Breaches",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums",
    cell: (row) => (
      <span className={row.breaches === 0 ? "text-success" : "text-error"}>
        {row.breaches}
      </span>
    ),
  },
  {
    id: "compliance",
    header: "Compliance",
    align: "right",
    skeleton: "short",
    cellClassName: "tabular-nums",
    cell: (row) => {
      const complianceRate = complianceRateOf(row);
      const complianceNum = parseFloat(complianceRate);
      return (
        <span
          className={
            complianceNum >= 90
              ? "text-success"
              : complianceNum >= 70
                ? "text-warning"
                : "text-error"
          }
        >
          {complianceRate}%
        </span>
      );
    },
  },
];

interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
}

interface SlaTeamTableProps {
  performance: SlaPerformanceResponse;
  users: UserInfo[];
}

export function SlaTeamTable({ performance, users }: SlaTeamTableProps) {
  const { breachByUser, avgResponseByUser } = performance;

  const breachMap = new Map<string, number>(
    breachByUser.map((b: SlaBreachByUser) => [b.assignedUserId, b.count]),
  );
  const responseMap = new Map<string, SlaAvgResponseByUser>(
    avgResponseByUser.map((r: SlaAvgResponseByUser) => [r.assignedUserId, r]),
  );

  const userMap = new Map(users.map((u) => [u.id, u]));

  const allUserIds = new Set([
    ...breachByUser.map((b: SlaBreachByUser) => b.assignedUserId),
    ...avgResponseByUser.map((r: SlaAvgResponseByUser) => r.assignedUserId),
  ]);

  const rows: TeamRow[] = Array.from(allUserIds)
    .map((userId) => {
      const user = userMap.get(userId);
      return {
        userId,
        name: user ? `${user.firstName} ${user.lastName}` : userId.slice(0, 8),
        breaches: breachMap.get(userId) ?? 0,
        avgMs: responseMap.get(userId)?.avgMs ?? 0,
        conversations: responseMap.get(userId)?.count ?? 0,
      };
    })
    .sort((a, b) => b.breaches - a.breaches);

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-body font-medium text-on-surface-variant mb-4">
        Team SLA Performance
      </h3>

      <DataTable
        label="Team SLA performance"
        columns={columns}
        rows={rows}
        rowKey={(row) => row.userId}
        rowLabel={(row) => row.name}
        empty={{
          icon: <Users className="h-10 w-10" />,
          title: "No team performance data available",
          compact: true,
        }}
      />
    </div>
  );
}
