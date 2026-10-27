"use client";

import { useState } from "react";
import { Wifi, Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAdminSessions, useAdminForceDisconnect, useAdminForceReconnect } from "@/hooks/use-whatsapp";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { SessionStatusBadge } from "@/components/whatsapp/session-status-badge";
import { PAGE_SIZE } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
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

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="lg" className="text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Wifi className="h-10 w-10 text-on-surface-variant/40 mb-3" />
            <p className="text-body-lg text-on-surface-variant">
              No sessions found
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-outline-variant">
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    User
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    Phone
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    Status
                  </th>
                  <th className="px-5 py-3 text-left text-label font-medium text-on-surface-variant">
                    Last active
                  </th>
                  <th className="px-5 py-3 text-right text-label font-medium text-on-surface-variant">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-outline-variant/60 last:border-0 hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-5 py-3">
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
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-body text-on-surface">
                        {s.phoneNumber ?? "—"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <SessionStatusBadge status={s.status} />
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-label text-on-surface-variant">
                        {s.lastActiveAt
                          ? formatRelativeTime(new Date(s.lastActiveAt))
                          : "Never"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-outline-variant">
            <span className="text-label text-on-surface-variant">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1">
              <IconButton size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1} aria-label="Previous page" className="max-lg:size-11">
                <ChevronLeft className="h-4 w-4" />
              </IconButton>
              <IconButton size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages} aria-label="Next page" className="max-lg:size-11">
                <ChevronRight className="h-4 w-4" />
              </IconButton>
            </div>
          </div>
        )}
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
