"use client";

import { useState } from "react";
import { Wifi, Search, RefreshCw } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAdminSessions, useAdminForceDisconnect, useAdminForceReconnect } from "@/hooks/use-whatsapp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { SessionStatusBadge } from "@/components/whatsapp/session-status-badge";
import { PAGE_SIZE } from "@/lib/constants";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";

type StatusFilter = "" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING" | "CONNECTING";

export default function AdminWhatsAppSessionsPage() {
  usePageTitle("WhatsApp sessions");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [userSearch, setUserSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminSessions({
    status: statusFilter || undefined,
    page,
    limit: PAGE_SIZE,
  });

  const forceDisconnect = useAdminForceDisconnect();
  const forceReconnect = useAdminForceReconnect();

  const sessions = data?.sessions ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Sessions are ordered by createdAt DESC — first occurrence per userId = most recent
  const latestSessionIdPerUser = new Set(
    sessions
      .reduce<string[]>((acc, s) => {
        if (!acc.includes(s.userId)) acc.push(s.userId);
        return acc;
      }, [])
      .map((userId) => sessions.find((s) => s.userId === userId)!.id)
  );

  // Client-side user name search (backend doesn't support it in this endpoint)
  const filtered = userSearch
    ? sessions.filter((s) => {
        const name = s.user
          ? `${s.user.firstName} ${s.user.lastName}`.toLowerCase()
          : "";
        return name.includes(userSearch.toLowerCase());
      })
    : sessions;

  const columns: DataTableColumn<(typeof sessions)[number]>[] = [
    {
      id: "user",
      header: "User",
      skeleton: "avatar",
      cell: (s) => (
        <div className="flex items-center gap-3">
          <Avatar
            name={
              s.user
                ? `${s.user.firstName} ${s.user.lastName}`
                : "Unknown"
            }
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-body font-medium text-on-surface truncate">
              {s.user
                ? `${s.user.firstName} ${s.user.lastName}`
                : "Unknown user"}
            </p>
            {s.user?.email && (
              <p className="text-caption text-on-surface-variant truncate">
                {s.user.email}
              </p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "phone",
      header: "Phone",
      cell: (s) => (
        <span className="text-body text-on-surface">
          {s.phoneNumber ?? "—"}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (s) => <SessionStatusBadge status={s.status} />,
    },
    {
      id: "lastActive",
      header: "Last active",
      skeleton: "short",
      cell: (s) => (
        <span className="text-label text-on-surface-variant">
          {s.lastActiveAt
            ? formatRelativeTime(new Date(s.lastActiveAt))
            : "Never"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      skeleton: "none",
      cell: (s) => (
        <div className="flex items-center justify-end gap-2">
          {s.status === "DISCONNECTED" && latestSessionIdPerUser.has(s.id) && s.hasCreds && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => forceReconnect.mutate(s.id)}
              loading={forceReconnect.isPending}
              title="Reconnect without re-scanning QR"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reconnect
            </Button>
          )}
          {s.status === "DISCONNECTED" && latestSessionIdPerUser.has(s.id) && !s.hasCreds && (
            <span className="text-caption text-on-surface-variant/50 italic">
              Needs QR re-scan
            </span>
          )}
          {s.status === "DISCONNECTED" && !latestSessionIdPerUser.has(s.id) && (
            <span className="text-caption text-on-surface-variant/30 italic">
              Old session
            </span>
          )}
          {(s.status === "CONNECTED" || s.status === "RECONNECTING") && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() =>
                forceDisconnect.mutate({
                  userId: s.userId,
                  reason: "Admin force disconnect",
                })
              }
              loading={forceDisconnect.isPending}
            >
              Disconnect
            </Button>
          )}
          {s.status === "CONNECTING" && (
            <span className="text-label text-on-surface-variant/50">
              Waiting for QR...
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 p-6 space-y-6">
      <div className="space-y-4">
        {/* Phones/tablets: the iOS nav bar shows the title */}
        <PageHeader className="max-lg:hidden" title="WhatsApp sessions" count={total} />

        {/* Filters on one row; phones put the search on its own full-width row first */}
        <FilterBar className="max-lg:gap-3">
          <div className="relative w-64 max-lg:order-first max-lg:w-full max-lg:basis-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant" />
            <input
              type="text"
              aria-label="Search by user name"
              placeholder="Search users"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="h-8 max-lg:h-11 w-full rounded-lg border border-outline-variant bg-surface-container-lowest pl-9 pr-3 text-body text-on-surface placeholder:text-on-surface-variant outline-none transition-colors hover:border-outline focus-visible:ring-2 focus-visible:ring-focus"
            />
          </div>

          <FilterBarDivider />

          <FilterSelect
            label="Status"
            active={!!statusFilter}
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as StatusFilter);
              setPage(1);
            }}
            className="max-lg:h-11"
          >
            <option value="">All statuses</option>
            <option value="CONNECTED">Connected</option>
            <option value="DISCONNECTED">Disconnected</option>
            <option value="RECONNECTING">Reconnecting</option>
            <option value="CONNECTING">Connecting</option>
          </FilterSelect>

          <span className="ml-auto text-label text-on-surface-variant lg:hidden">
            {total} session{total !== 1 ? "s" : ""}
          </span>
        </FilterBar>
      </div>

      <Card className="!p-0 overflow-hidden">

        <DataTable
          label="WhatsApp sessions"
          columns={columns}
          rows={filtered}
          rowKey={(s) => s.id}
          rowLabel={(s) => (s.user ? `${s.user.firstName} ${s.user.lastName}` : "Unknown user")}
          loading={isLoading}
          skeletonRows={6}
          pagination={{
            page: page - 1,
            pageSize: PAGE_SIZE,
            total,
            onPageChange: (p) => setPage(p + 1),
          }}
          // The user search only filters the current page, so keep the pager reachable
          // when this page has no matches but others might.
          empty={
            totalPages > 1
              ? undefined
              : { icon: <Wifi className="h-12 w-12" />, title: "No sessions found", description: "" }
          }
        />
      </Card>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
