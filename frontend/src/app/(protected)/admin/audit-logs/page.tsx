"use client";

import { useState } from "react";
import {
  ShieldAlert,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuditLogs } from "@/hooks/use-rbac";
import { useAuthStore } from "@/stores/auth-store";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Avatar } from "@/components/ui/avatar";
import type { AuditLog, QueryAuditLogsParams } from "@/lib/types/rbac";
import { PAGE_SIZE } from "@/lib/constants";

const ACTION_OPTIONS = [
  { value: "", label: "All actions" },
  { value: "PERMISSION_DENIED", label: "Permission denied" },
  { value: "CROSS_TENANT_ACCESS_BLOCKED", label: "Cross-tenant blocked" },
  { value: "ROLE_PERMISSION_UPDATED", label: "Role permission updated" },
  { value: "LOGIN_SUCCESS", label: "Login" },
  { value: "LOGOUT", label: "Logout" },
  { value: "USER_CREATED", label: "User created" },
  { value: "USER_UPDATED", label: "User updated" },
  { value: "ORG_SETTINGS_UPDATED", label: "Org settings updated" },
  { value: "CHATBOT_FLOW_UPDATED", label: "Chatbot flow updated" },
  { value: "CHATBOT_SETTINGS_UPDATED", label: "Bot settings updated" },
  { value: "KB_DOCUMENT_UPLOADED", label: "Knowledge document uploaded" },
  { value: "KB_SOURCE_ADDED", label: "Website added to knowledge" },
  { value: "AI_REPLY_LIMIT_REACHED", label: "AI reply limit reached" },
];

const DATE_INPUT_CLASS =
  "h-8 rounded-lg border border-outline-variant bg-surface-container-lowest px-2.5 text-label text-on-surface outline-none transition-colors hover:border-outline focus-visible:ring-2 focus-visible:ring-focus max-lg:h-11 max-lg:min-w-0 max-lg:flex-1 max-lg:px-2";

function getActionBadgeVariant(action: string): "error" | "warning" | "primary" | "default" {
  if (action.includes("DENIED") || action.includes("BLOCKED")) return "error";
  if (action.includes("LIMIT_REACHED")) return "warning";
  if (action.includes("PERMISSION") || action.includes("ROLE")) return "warning";
  if (action.includes("LOGIN") || action.includes("CREATED")) return "primary";
  return "default";
}

export default function AuditLogsPage() {
  usePageTitle("Audit logs");

  const user = useAuthStore((s) => s.user);
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const params: QueryAuditLogsParams = {
    take: PAGE_SIZE,
    skip: (page - 1) * PAGE_SIZE,
    ...(actionFilter && { action: actionFilter }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data, isLoading } = useAuditLogs(params);

  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;

  const clearFilters = () => {
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasFilters = actionFilter || startDate || endDate;

  const columns: DataTableColumn<AuditLog>[] = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (log) => (
        <div className="flex items-center gap-2">
          {/* Phones: the whole card toggles details, so the chevron is hidden */}
          <span className="shrink-0 text-on-surface-variant/50 max-lg:hidden" aria-hidden>
            {expandedId === log.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </span>
          <span className="text-label text-on-surface-variant font-mono">{formatTimestamp(log.createdAt)}</span>
        </div>
      ),
    },
    { id: "action", header: "Action", skeleton: "badge", cell: (log) => <ActionBadge action={log.action} /> },
    { id: "user", header: "User", skeleton: "avatar", cell: (log) => <UserCell log={log} /> },
    {
      id: "target",
      header: "Target",
      cell: (log) =>
        log.targetType ? (
          <div>
            <span className="text-label text-on-surface-variant">{log.targetType}</span>
            {log.targetId && (
              <p className="text-caption text-on-surface-variant/60 font-mono truncate max-w-[160px]">{log.targetId}</p>
            )}
          </div>
        ) : (
          <span className="text-label text-on-surface-variant/40">—</span>
        ),
    },
    {
      id: "ip",
      header: "IP Address",
      cell: (log) => <span className="text-label text-on-surface-variant font-mono">{log.ipAddress ?? "—"}</span>,
    },
  ];

  // Guard: ADMIN only
  if (user?.role !== "ADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="text-body-lg text-on-surface-variant">
            You don&apos;t have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="space-y-4">
        {/* Phones/tablets: the iOS nav bar shows the title */}
        <PageHeader className="max-lg:hidden" title="Audit logs" count={total} />

        {/* Every filter on one row; phones keep the full-width select and date rows */}
        <FilterBar>
          <FilterSelect
            label="Action"
            active={!!actionFilter}
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="max-lg:h-11 max-lg:w-full"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </FilterSelect>

          <FilterBarDivider />

          {/* Phones: the two dates share one full-width row */}
          <div className="flex items-center gap-2 max-lg:w-full">
            <input
              type="date"
              aria-label="From date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className={DATE_INPUT_CLASS}
              placeholder="From"
            />
            <span className="text-label text-on-surface-variant">to</span>
            <input
              type="date"
              aria-label="To date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className={DATE_INPUT_CLASS}
              placeholder="To"
            />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-3.5 w-3.5" />
              Clear
            </Button>
          )}

          <span className="ml-auto text-label text-on-surface-variant lg:hidden">
            {total} event{total !== 1 ? "s" : ""}
          </span>
        </FilterBar>
      </div>

      {/* Logs Table */}
      <Card className="!p-0 overflow-hidden">
        <DataTable
          label="Audit logs"
          columns={columns}
          rows={logs}
          rowKey={(log) => log.id}
          rowLabel={(log) => `${formatActionLabel(log.action)} details`}
          loading={isLoading}
          // Clicking a row opens its details underneath
          onRowClick={(log) => setExpandedId(expandedId === log.id ? null : log.id)}
          rowClassName={() => "cursor-pointer"}
          renderExpandedRow={(log) => <LogDetail log={log} />}
          isRowExpanded={(log) => expandedId === log.id}
          pagination={{
            page: page - 1,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: (p) => setPage(p + 1),
          }}
          empty={{
            icon: <ShieldAlert className="h-10 w-10" />,
            title: "No audit logs found",
            ...(hasFilters && { description: "Try adjusting your filters" }),
          }}
        />
      </Card>
    </div>
  );
}

// ─── User cell ────────────────────────────────
function UserCell({ log }: { log: AuditLog }) {
  const userName = log.user ? `${log.user.firstName} ${log.user.lastName}` : "System";
  return (
    <div className="flex items-center gap-2">
      <Avatar name={userName} size="sm" />
      <div className="min-w-0">
        <p className="text-body font-medium text-on-surface truncate">{userName}</p>
        {log.user?.email && <p className="text-caption text-on-surface-variant truncate">{log.user.email}</p>}
      </div>
    </div>
  );
}

// ─── Expanded detail row ──────────────────────
function LogDetail({ log }: { log: AuditLog }) {
  return (
    <div className="space-y-2 text-left">
      <p className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">Details</p>
      {log.metadata ? (
        <pre className="text-label text-on-surface-variant bg-surface-container-lowest rounded-lg p-3 overflow-x-auto max-h-[200px] font-mono">
          {JSON.stringify(log.metadata, null, 2)}
        </pre>
      ) : (
        <p className="text-label text-on-surface-variant/50">No additional details</p>
      )}
      {log.userAgent && <p className="text-caption text-on-surface-variant/50 truncate">UA: {log.userAgent}</p>}
    </div>
  );
}

// ─── Action Badge ─────────────────────────────
function ActionBadge({ action }: { action: string }) {
  const variant = getActionBadgeVariant(action);
  const colorClasses = {
    error: "bg-error-container text-error",
    warning: "bg-warning-container text-warning",
    primary: "bg-primary-container/20 text-primary",
    default: "bg-surface-container-high text-on-surface-variant",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-caption font-medium ${colorClasses[variant]}`}
    >
      {formatActionLabel(action)}
    </span>
  );
}

// ─── Helpers ──────────────────────────────────
function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatActionLabel(action: string): string {
  return action
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
