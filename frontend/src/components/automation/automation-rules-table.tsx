"use client";

import { Zap, MoreVertical, Power, PowerOff, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { RuleStatusBadge } from "./rule-status-badge";
import { TriggerTypeLabel } from "./trigger-type-label";
import type { AutomationRule } from "@/lib/types/automation";
import { IconButton } from "@/components/ui/icon-button";

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

  const columns = useMemo<DataTableColumn<AutomationRule>[]>(
    () => [
      {
        id: "name",
        header: "Rule Name",
        cell: (rule) => (
          <>
            <p className="text-body font-medium text-on-surface truncate max-w-[280px]">
              {rule.name}
            </p>
            {rule.description && (
              <p className="text-caption text-on-surface-variant/60 truncate max-w-[280px]">
                {rule.description}
              </p>
            )}
          </>
        ),
      },
      {
        id: "trigger",
        header: "Trigger",
        skeleton: "badge",
        cell: (rule) => <TriggerTypeLabel triggerType={rule.triggerType} />,
      },
      {
        id: "status",
        header: "Status",
        skeleton: "badge",
        cell: (rule) => <RuleStatusBadge status={rule.status} />,
      },
      {
        id: "executions",
        header: "Executions",
        align: "center",
        skeleton: "short",
        cell: (rule) => (
          <span className="text-label text-on-surface-variant tabular-nums">
            {rule.executionCount.toLocaleString()}
          </span>
        ),
      },
      {
        id: "lastTriggered",
        header: "Last Triggered",
        skeleton: "short",
        cell: (rule) => (
          <span className="text-label text-on-surface-variant">
            {rule.lastTriggeredAt ? timeAgo(rule.lastTriggeredAt) : "—"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        skeleton: "none",
        cell: (rule) => (
          <div
            className="relative inline-flex justify-end"
            onClick={(e) => e.stopPropagation()}
          >
            <IconButton size="xs"
              onClick={() =>
                setOpenMenu(openMenu === rule.id ? null : rule.id)
              } aria-label="More actions">
              <MoreVertical className="h-4 w-4" />
            </IconButton>

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
                      className="flex items-center gap-2 w-full px-3 py-2 text-body text-on-surface hover:bg-surface-container transition-colors"
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
                      className="flex items-center gap-2 w-full px-3 py-2 text-body text-on-surface hover:bg-surface-container transition-colors"
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
                    className="flex items-center gap-2 w-full px-3 py-2 text-body text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        ),
      },
    ],
    [openMenu, onEnable, onDisable, onDelete],
  );

  return (
    <DataTable
      label="Automation rules"
      columns={columns}
      rows={rules}
      rowKey={(rule) => rule.id}
      rowLabel={(rule) => rule.name}
      loading={isLoading}
      skeletonRows={6}
      onRowClick={(rule) => router.push(`/automation/${rule.id}`)}
      rowClassName={() => "cursor-pointer"}
      pagination={{ page: Math.floor(skip / take), pageSize: take, total, onPageChange }}
      empty={{
        icon: <Zap className="h-12 w-12" />,
        title: "No automation rules",
        description: "Create your first automation rule to automate your WhatsApp workflows.",
        actionLabel: "New Rule",
        onAction: onCreateClick,
      }}
    />
  );
}
