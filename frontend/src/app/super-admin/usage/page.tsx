"use client";

import { useState } from "react";
import Link from "next/link";
import { useSAUsage } from "@/hooks/use-super-admin";
import { DailyBars } from "@/components/super-admin/daily-bars";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { CARD } from "@/components/super-admin/list-styles";

const RANGES = [7, 30, 90] as const;

function pct(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className={cn(CARD, "p-4")}>
      <p className="text-label text-on-surface-variant">{label}</p>
      <p className="text-headline font-semibold text-on-surface tabular-nums mt-1">{value}</p>
      {sub && <p className="text-caption text-on-surface-variant mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SuperAdminUsagePage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isLoading, isError, isFetching, refetch } = useSAUsage(days);
  const topMax = Math.max(0, ...(data?.topOrgs ?? []).map((o) => o.outbound));

  const topOrgColumns: DataTableColumn<NonNullable<typeof data>["topOrgs"][number]>[] = [
    {
      id: "organization",
      header: "Organization",
      cell: (o) => (
        <Link href={`/super-admin/organizations/${o.orgId}`} className="text-on-surface hover:text-primary">
          {o.name}
        </Link>
      ),
    },
    {
      id: "sent",
      header: "Sent",
      className: "w-1/2",
      skeleton: "bar",
      cell: (o) => (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 rounded-full bg-surface-container" aria-hidden>
            <div
              className="h-2 rounded-full bg-chart-bar"
              style={{ width: `${topMax > 0 ? Math.max(2, (o.outbound / topMax) * 100) : 0}%` }}
            />
          </div>
          <span className="tabular-nums text-on-surface w-16 text-right">{o.outbound.toLocaleString()}</span>
        </div>
      ),
    },
    {
      id: "failed",
      header: "Failed",
      align: "right",
      cellClassName: "tabular-nums text-on-surface-variant",
      cell: (o) => o.failed.toLocaleString(),
    },
    {
      id: "failRate",
      header: "Fail rate",
      align: "right",
      cellClassName: "tabular-nums text-on-surface-variant",
      cell: (o) => pct(o.failed, o.outbound),
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Usage"
        description="All organizations, UTC days"
        actions={
          <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-outline-variant p-0.5">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                aria-pressed={days === r}
                onClick={() => setDays(r)}
                className={cn(
                  "px-3 py-1.5 rounded-md text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                  days === r ? "bg-primary/10 text-primary font-medium" : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      />

      {isError ? (
        <Alert variant="error">
          Could not load usage.{" "}
          <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
            Try again
          </button>
        </Alert>
      ) : isLoading || !data ? (
        <div className="flex justify-center py-16" role="status">
          <Spinner />
          <span className="sr-only">Loading usage…</span>
        </div>
      ) : (
        <div className={cn("space-y-5 transition-opacity", isFetching && "opacity-60")}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile label="Messages sent" value={data.totals.outbound.toLocaleString()} sub={`last ${data.days} days`} />
            <StatTile label="Messages received" value={data.totals.inbound.toLocaleString()} sub={`last ${data.days} days`} />
            <StatTile
              label="Failed sends"
              value={data.totals.failed.toLocaleString()}
              sub={`${pct(data.totals.failed, data.totals.outbound)} of sent`}
            />
          </div>

          {/* Small multiples, one series each — never two scales on one chart */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <DailyBars
              title="Sent"
              unit="messages sent"
              points={data.daily.map((d) => ({ date: d.date, value: d.outbound }))}
            />
            <DailyBars
              title="Received"
              unit="messages received"
              points={data.daily.map((d) => ({ date: d.date, value: d.inbound }))}
            />
            <DailyBars
              title="Failed sends"
              unit="sends failed"
              points={data.daily.map((d) => ({ date: d.date, value: d.failed }))}
            />
          </div>

          <section aria-labelledby="top-orgs-heading" className={cn(CARD, "p-4 space-y-3")}>
            <h2 id="top-orgs-heading" className="text-body-lg font-semibold text-on-surface">
              Top organizations by messages sent
            </h2>
            <DataTable
              label={`Top 10 organizations by messages sent, last ${data.days} days`}
              columns={topOrgColumns}
              rows={data.topOrgs}
              rowKey={(o) => o.orgId}
              empty={{
                icon: <Send className="h-10 w-10" />,
                title: `No messages sent in the last ${data.days} days`,
                compact: true,
              }}
            />
          </section>
        </div>
      )}
    </div>
  );
}
