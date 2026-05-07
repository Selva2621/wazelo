"use client";

import { Zap, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { RuleStatusBadge } from "./rule-status-badge";
import { TriggerTypeLabel } from "./trigger-type-label";
import type { AutomationRule } from "@/lib/types/automation";

interface AutomationRulesTableProps {
  rules: AutomationRule[];
  total: number;
  take: number;
  skip: number;
  isLoading: boolean;
  onEnable: (id: string) => void;
  onDisable: (id: string) => void;
  onDelete: (id: string) => void;
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

export function AutomationRulesTable({
  rules,
  total,
  take,
  skip,
  isLoading,
  onEnable,
  onDisable,
  onDelete,
  onPageChange,
  onCreateClick,
}: AutomationRulesTableProps) {
  const router = useRouter();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const currentPage = Math.floor(skip / take) + 1;
  const totalPages = Math.ceil(total / take);

  if (isLoading) {
    return (
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Rule Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead align="center">Executions</TableHead>
            <TableHead>Last Triggered</TableHead>
            <TableHead align="right">Actions</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="space-y-1.5">
                  <div className="h-3.5 w-40 rounded bg-surface-container-high animate-pulse" />
                  <div className="h-3 w-28 rounded bg-surface-container-high animate-pulse" />
                </div>
              </TableCell>
              <TableCell><div className="h-5 w-24 rounded-full bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell><div className="h-5 w-16 rounded-full bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell align="center"><div className="h-3.5 w-8 rounded bg-surface-container-high animate-pulse mx-auto" /></TableCell>
              <TableCell><div className="h-3.5 w-20 rounded bg-surface-container-high animate-pulse" /></TableCell>
              <TableCell align="right"><div className="h-5 w-5 rounded bg-surface-container-high animate-pulse ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (rules.length === 0) {
    return (
      <EmptyState
        icon={<Zap className="h-12 w-12" />}
        title="No automation rules"
        description="Create your first automation rule to automate your WhatsApp workflows."
        actionLabel="New Rule"
        onAction={onCreateClick}
      />
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableHeaderRow>
            <TableHead>Rule Name</TableHead>
            <TableHead>Trigger</TableHead>
            <TableHead>Status</TableHead>
            <TableHead align="center">Executions</TableHead>
            <TableHead>Last Triggered</TableHead>
            <TableHead align="right">Actions</TableHead>
          </TableHeaderRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow
              key={rule.id}
              onClick={() => router.push(`/automation/${rule.id}`)}
              className="cursor-pointer"
            >
              {/* Name + Description */}
              <TableCell>
                <p className="text-[13px] font-medium text-on-surface truncate max-w-[280px]">
                  {rule.name}
                </p>
                {rule.description && (
                  <p className="text-[11px] text-on-surface-variant/60 truncate max-w-[280px]">
                    {rule.description}
                  </p>
                )}
              </TableCell>

              {/* Trigger */}
              <TableCell>
                <TriggerTypeLabel triggerType={rule.triggerType} />
              </TableCell>

              {/* Status */}
              <TableCell>
                <RuleStatusBadge status={rule.status} />
              </TableCell>

              {/* Execution count */}
              <TableCell align="center">
                <span className="text-[12px] text-on-surface-variant tabular-nums">
                  {rule.executionCount.toLocaleString()}
                </span>
              </TableCell>

              {/* Last triggered */}
              <TableCell>
                <span className="text-[12px] text-on-surface-variant">
                  {rule.lastTriggeredAt ? timeAgo(rule.lastTriggeredAt) : "—"}
                </span>
              </TableCell>

              {/* Actions menu */}
              <TableCell align="right">
                <div
                  className="relative inline-flex justify-end"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() =>
                      setOpenMenu(openMenu === rule.id ? null : rule.id)
                    }
                    className="p-1 rounded-lg text-on-surface-variant/40 hover:text-on-surface hover:bg-surface-container transition-colors"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {openMenu === rule.id && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setOpenMenu(null)}
                      />
                      <div className="absolute right-0 top-full mt-1 z-50 w-40 rounded-xl bg-surface-container-high shadow-lg border border-outline-variant/15 py-1">
                        {rule.status === "INACTIVE" ? (
                          <button
                            onClick={() => {
                              onEnable(rule.id);
                              setOpenMenu(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container transition-colors"
                          >
                            <Power className="h-3.5 w-3.5" />
                            Enable
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              onDisable(rule.id);
                              setOpenMenu(null);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-on-surface hover:bg-surface-container transition-colors"
                          >
                            <PowerOff className="h-3.5 w-3.5" />
                            Disable
                          </button>
                        )}
                        <button
                          onClick={() => {
                            onDelete(rule.id);
                            setOpenMenu(null);
                          }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[13px] text-error hover:bg-error/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Pagination
        page={currentPage}
        totalPages={totalPages}
        total={total}
        onPageChange={(p) => onPageChange(p - 1)}
      />
    </div>
  );
}
