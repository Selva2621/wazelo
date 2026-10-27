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
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
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
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const clearFilters = () => {
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  };

  const hasFilters = actionFilter || startDate || endDate;

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
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ShieldAlert className="h-10 w-10 text-on-surface-variant/40 mb-3" />
            <p className="text-body-lg text-on-surface-variant">
              No audit logs found
            </p>
            {hasFilters && (
              <p className="text-label text-on-surface-variant/60 mt-1">
                Try adjusting your filters
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant w-8" />
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    Timestamp
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    Action
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    User
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    Target
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    IP Address
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, idx) => (
                  <LogRow
                    key={log.id}
                    log={log}
                    idx={idx}
                    expanded={expandedId === log.id}
                    onToggle={() =>
                      setExpandedId(expandedId === log.id ? null : log.id)
                    }
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}

// ─── Log Row Component ────────────────────────
function LogRow({
  log,
  idx,
  expanded,
  onToggle,
}: {
  log: AuditLog;
  idx: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const userName = log.user
    ? `${log.user.firstName} ${log.user.lastName}`
    : "System";

  return (
    <>
      <tr
        className={`border-b border-outline-variant/10 last:border-0 hover:bg-surface-container/15 transition-colors cursor-pointer ${
          idx % 2 === 0 ? "" : "bg-surface-container/5"
        }`}
        onClick={onToggle}
      >
        {/* Phones: the whole card toggles details, so the chevron cell is hidden */}
        <td className="px-5 py-3 max-lg:hidden!">
          <button aria-expanded={expanded} aria-label={expanded ? "Collapse row" : "Expand row"} className="text-on-surface-variant/50 hover:text-on-surface-variant">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </td>
        <td className="px-5 py-3">
          <span className="text-label text-on-surface-variant font-mono">
            {formatTimestamp(log.createdAt)}
          </span>
        </td>
        <td className="px-5 py-3">
          <ActionBadge action={log.action} />
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2">
            <Avatar name={userName} size="sm" />
            <div className="min-w-0">
              <p className="text-body font-medium text-on-surface truncate">
                {userName}
              </p>
              {log.user?.email && (
                <p className="text-caption text-on-surface-variant truncate">
                  {log.user.email}
                </p>
              )}
            </div>
          </div>
        </td>
        <td className="px-5 py-3">
          {log.targetType ? (
            <div>
              <span className="text-label text-on-surface-variant">
                {log.targetType}
              </span>
              {log.targetId && (
                <p className="text-caption text-on-surface-variant/60 font-mono truncate max-w-[160px]">
                  {log.targetId}
                </p>
              )}
            </div>
          ) : (
            <span className="text-label text-on-surface-variant/40">—</span>
          )}
        </td>
        <td className="px-5 py-3">
          <span className="text-label text-on-surface-variant font-mono">
            {log.ipAddress ?? "—"}
          </span>
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="bg-surface-container/10">
          <td colSpan={6} className="px-5 py-4 max-lg:px-1 max-lg:py-2 max-lg:text-left!">
            <div className="space-y-2">
              <p className="text-caption font-semibold uppercase tracking-wider text-on-surface-variant">
                Details
              </p>
              {log.metadata ? (
                <pre className="text-label text-on-surface-variant bg-surface-container-lowest rounded-lg p-3 overflow-x-auto max-h-[200px] font-mono">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              ) : (
                <p className="text-label text-on-surface-variant/50">
                  No additional details
                </p>
              )}
              {log.userAgent && (
                <p className="text-caption text-on-surface-variant/50 truncate">
                  UA: {log.userAgent}
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
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
