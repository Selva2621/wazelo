"use client";

import type {
  SlaPerformanceResponse,
  SlaBreachByUser,
  SlaAvgResponseByUser,
} from "@/lib/types/sla";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

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

  const rows = Array.from(allUserIds)
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
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Team SLA Performance
      </h3>

      {rows.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-on-surface-variant/40">
          No team performance data available
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Name</TableHead>
              <TableHead align="right">Avg Response</TableHead>
              <TableHead align="right">Conversations</TableHead>
              <TableHead align="right">Breaches</TableHead>
              <TableHead align="right">Compliance</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const complianceRate =
                row.conversations > 0
                  ? (
                      ((row.conversations - row.breaches) /
                        row.conversations) *
                      100
                    ).toFixed(1)
                  : "100.0";
              const complianceNum = parseFloat(complianceRate);

              return (
                <TableRow key={row.userId}>
                  <TableCell className="text-on-surface font-medium">
                    {row.name}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-on-surface-variant">
                    {row.avgMs > 0 ? formatMs(row.avgMs) : "—"}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums text-on-surface">
                    {row.conversations}
                  </TableCell>
                  <TableCell align="right" className="tabular-nums">
                    <span className={row.breaches === 0 ? "text-success" : "text-error"}>
                      {row.breaches}
                    </span>
                  </TableCell>
                  <TableCell align="right" className="tabular-nums">
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
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
