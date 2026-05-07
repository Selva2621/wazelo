"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSASubscriptions } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import { PAGE_SIZE } from "@/lib/constants";

const STATUS_OPTIONS = ["", "ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD", "EXPIRED", "CANCELLED"];

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    ACTIVE: "bg-green-500/10 text-green-400",
    TRIAL: "bg-yellow-500/10 text-yellow-400",
    PAST_DUE: "bg-orange-500/10 text-orange-400",
    GRACE_PERIOD: "bg-orange-500/10 text-orange-400",
    EXPIRED: "bg-red-500/10 text-red-400",
    CANCELLED: "bg-surface-container text-on-surface-variant",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? "bg-surface-container text-on-surface-variant"}`}>{status}</span>;
}

export default function SuperAdminSubscriptionsPage() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useSASubscriptions({ page, limit: PAGE_SIZE, status: status || undefined });

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-on-surface">All Subscriptions</h1>

      <select
        value={status}
        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        className="bg-surface-container border border-outline-variant text-sm text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
      >
        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s || "All statuses"}</option>)}
      </select>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <th className="px-4 py-3 text-on-surface-variant font-medium">Organization</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Plan</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Status</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Cycle</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Price</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Period End</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
            ) : data?.subscriptions?.map((sub: any) => (
              <tr key={sub.id} className="hover:bg-surface-container transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/super-admin/organizations/${sub.organization?.id}`} className="font-medium text-on-surface hover:text-primary">
                    {sub.organization?.name}
                  </Link>
                  <p className="text-xs text-on-surface-variant">{sub.organization?.slug}</p>
                </td>
                <td className="px-4 py-3 text-on-surface">{sub.plan?.name}</td>
                <td className="px-4 py-3">{statusBadge(sub.status)}</td>
                <td className="px-4 py-3 text-on-surface-variant">{sub.billingCycle}</td>
                <td className="px-4 py-3 text-on-surface">₹{(sub.priceInCents / 100).toLocaleString()}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(sub.currentPeriodEnd).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <span className="text-xs text-on-surface-variant">{data.total} total</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded text-on-surface-variant hover:text-on-surface disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>
              <span className="text-xs text-on-surface-variant">{page} / {data.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} className="p-1 rounded text-on-surface-variant hover:text-on-surface disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
