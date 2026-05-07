"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSATickets } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import { PAGE_SIZE } from "@/lib/constants";

const STATUS_OPTIONS = ["", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
const CATEGORY_OPTIONS = ["", "BILLING", "TECHNICAL", "GENERAL", "FEATURE_REQUEST"];
const PRIORITY_OPTIONS = ["", "LOW", "MEDIUM", "HIGH", "URGENT"];

function priorityBadge(p: string) {
  const c: Record<string, string> = {
    LOW: "text-on-surface-variant bg-surface-container",
    MEDIUM: "text-blue-400 bg-blue-500/10",
    HIGH: "text-orange-400 bg-orange-500/10",
    URGENT: "text-red-400 bg-red-500/10",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c[p] ?? "bg-surface-container text-on-surface-variant"}`}>{p}</span>;
}

function statusBadge(s: string) {
  const c: Record<string, string> = {
    OPEN: "text-green-400 bg-green-500/10",
    IN_PROGRESS: "text-blue-400 bg-blue-500/10",
    RESOLVED: "text-on-surface-variant bg-surface-container",
    CLOSED: "text-on-surface-variant bg-surface-container",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c[s] ?? "bg-surface-container text-on-surface-variant"}`}>{s.replace("_", " ")}</span>;
}

export default function SuperAdminTicketsPage() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState("");
  const [page, setPage] = useState(1);
  const orgId = searchParams.get("orgId") ?? undefined;

  const { data, isLoading } = useSATickets({ page, limit: PAGE_SIZE, status: status || undefined, category: category || undefined, priority: priority || undefined, orgId });

  return (
    <div className="p-6 space-y-5">
      <h1 className="text-xl font-bold text-on-surface">Help Tickets</h1>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: status, onChange: (v: string) => { setStatus(v); setPage(1); }, options: STATUS_OPTIONS, placeholder: "All statuses" },
          { value: category, onChange: (v: string) => { setCategory(v); setPage(1); }, options: CATEGORY_OPTIONS, placeholder: "All categories" },
          { value: priority, onChange: (v: string) => { setPriority(v); setPage(1); }, options: PRIORITY_OPTIONS, placeholder: "All priorities" },
        ].map((sel, i) => (
          <select key={i} value={sel.value} onChange={(e) => sel.onChange(e.target.value)}
            className="bg-surface-container border border-outline-variant text-sm text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary">
            {sel.options.map((s) => <option key={s} value={s}>{s || sel.placeholder}</option>)}
          </select>
        ))}
      </div>

      <div className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline-variant text-left">
              <th className="px-4 py-3 text-on-surface-variant font-medium">Title</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Org</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Category</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Priority</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Status</th>
              <th className="px-4 py-3 text-on-surface-variant font-medium">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {isLoading ? (
              <tr><td colSpan={6} className="py-12 text-center"><Spinner className="mx-auto text-primary" /></td></tr>
            ) : data?.tickets?.length === 0 ? (
              <tr><td colSpan={6} className="py-12 text-center text-on-surface-variant">No tickets found</td></tr>
            ) : data?.tickets?.map((t: any) => (
              <tr key={t.id} className="hover:bg-surface-container transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/super-admin/tickets/${t.id}`} className="font-medium text-on-surface hover:text-primary line-clamp-1">{t.title}</Link>
                  <p className="text-xs text-on-surface-variant">{t.user?.firstName} {t.user?.lastName}</p>
                </td>
                <td className="px-4 py-3 text-on-surface-variant">{t.organization?.name}</td>
                <td className="px-4 py-3 text-on-surface-variant text-xs">{t.category}</td>
                <td className="px-4 py-3">{priorityBadge(t.priority)}</td>
                <td className="px-4 py-3">{statusBadge(t.status)}</td>
                <td className="px-4 py-3 text-on-surface-variant">{new Date(t.createdAt).toLocaleDateString()}</td>
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
