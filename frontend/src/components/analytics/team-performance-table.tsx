"use client";

import type { TeamPerformanceResponse } from "@/lib/types/analytics";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";

function formatMs(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return "<1s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSec = seconds % 60;
  return `${minutes}m ${remainingSec}s`;
}

interface TeamPerformanceTableProps {
  data: TeamPerformanceResponse;
}

export function TeamPerformanceTable({ data }: TeamPerformanceTableProps) {
  const sorted = [...data.users].sort((a, b) => b.messagesSent - a.messagesSent);

  return (
    <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
      <h3 className="text-[13px] font-medium text-on-surface-variant mb-4">
        Team Performance
      </h3>

      {sorted.length === 0 ? (
        <div className="py-8 text-center text-[13px] text-on-surface-variant/40">
          No team data available
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableHeaderRow>
              <TableHead>Name</TableHead>
              <TableHead align="right">Sent</TableHead>
              <TableHead align="right">Received</TableHead>
              <TableHead align="right">Avg Response</TableHead>
              <TableHead align="right">Converted</TableHead>
              <TableHead align="right">Active Convos</TableHead>
            </TableHeaderRow>
          </TableHeader>
          <TableBody>
            {sorted.map((user) => (
              <TableRow key={user.userId}>
                <TableCell className="text-on-surface font-medium">
                  {user.firstName} {user.lastName}
                </TableCell>
                <TableCell align="right" className="tabular-nums text-on-surface">
                  {user.messagesSent.toLocaleString()}
                </TableCell>
                <TableCell align="right" className="tabular-nums text-on-surface-variant">
                  {user.messagesReceived.toLocaleString()}
                </TableCell>
                <TableCell align="right" className="tabular-nums text-on-surface-variant">
                  {formatMs(user.avgResponseTimeMs)}
                </TableCell>
                <TableCell align="right" className="tabular-nums text-success">
                  {user.contactsConverted}
                </TableCell>
                <TableCell align="right" className="tabular-nums text-on-surface-variant">
                  {user.activeConversations}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
