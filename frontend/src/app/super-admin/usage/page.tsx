"use client";

import { useState } from "react";
import Link from "next/link";
import { useSAUsage } from "@/hooks/use-super-admin";
import { DailyBars } from "@/components/super-admin/daily-bars";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const RANGES = [7, 30, 90] as const;

function pct(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
      <p className="text-label text-on-surface-variant">{label}</p>
      <p className="text-title font-semibold text-on-surface tabular-nums mt-1">{value}</p>
      {sub && <p className="text-label text-on-surface-variant mt-0.5">{sub}</p>}
    </div>
  );
}

export default function SuperAdminUsagePage() {
  const [days, setDays] = useState<(typeof RANGES)[number]>(30);
  const { data, isLoading, isError, isFetching, refetch } = useSAUsage(days);
  const topMax = Math.max(0, ...(data?.topOrgs ?? []).map((o) => o.outbound));

  return (
    <div className="p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-title font-semibold text-on-surface">Usage</h1>
          <p className="text-body-lg text-on-surface-variant">Messages across all organizations (UTC days).</p>
        </div>
        <div role="group" aria-label="Time range" className="inline-flex rounded-lg border border-outline-variant p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={days === r}
              onClick={() => setDays(r)}
              className={cn(
                "px-3 py-1.5 rounded-md text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                days === r ? "bg-primary/10 text-primary font-medium" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

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

          <section aria-labelledby="top-orgs-heading" className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3">
            <h2 id="top-orgs-heading" className="text-body-lg font-semibold text-on-surface">
              Top organizations by messages sent
            </h2>
            {data.topOrgs.length === 0 ? (
              <p className="text-body text-on-surface-variant">No messages sent in the last {data.days} days.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-body-lg">
                  <caption className="sr-only">Top 10 organizations by messages sent, last {data.days} days</caption>
                  <thead>
                    <tr className="text-left border-b border-outline-variant">
                      <th scope="col" className="py-2 pr-3 text-label font-medium text-on-surface-variant">Organization</th>
                      <th scope="col" className="py-2 pr-3 text-label font-medium text-on-surface-variant w-1/2">Sent</th>
                      <th scope="col" className="py-2 pr-3 text-label font-medium text-on-surface-variant text-right">Failed</th>
                      <th scope="col" className="py-2 text-label font-medium text-on-surface-variant text-right">Fail rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40">
                    {data.topOrgs.map((o) => (
                      <tr key={o.orgId}>
                        <td className="py-2 pr-3">
                          <Link href={`/super-admin/organizations/${o.orgId}`} className="text-on-surface hover:text-primary">
                            {o.name}
                          </Link>
                        </td>
                        <td className="py-2 pr-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full bg-surface-container" aria-hidden>
                              <div
                                className="h-2 rounded-full bg-chart-bar"
                                style={{ width: `${topMax > 0 ? Math.max(2, (o.outbound / topMax) * 100) : 0}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-on-surface w-16 text-right">{o.outbound.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums text-on-surface-variant">{o.failed.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums text-on-surface-variant">{pct(o.failed, o.outbound)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
