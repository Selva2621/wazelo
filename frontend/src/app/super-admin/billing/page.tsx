"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useSAInvoices, useSAPayments } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";
import { IconButton } from "@/components/ui/icon-button";
import { cn, formatMoney } from "@/lib/utils";

type Tab = "payments" | "invoices";

const PAYMENT_STATUSES = ["", "SUCCEEDED", "PENDING", "PROCESSING", "FAILED", "REFUNDED"];
const INVOICE_STATUSES = ["", "PAID", "OPEN", "DRAFT", "VOID", "UNCOLLECTIBLE"];

const STATUS_STYLE: Record<string, string> = {
  SUCCEEDED: "bg-success/10 text-success",
  PAID: "bg-success/10 text-success",
  PENDING: "bg-warning/10 text-warning",
  PROCESSING: "bg-warning/10 text-warning",
  OPEN: "bg-warning/10 text-warning",
  FAILED: "bg-error/10 text-error",
  UNCOLLECTIBLE: "bg-error/10 text-error",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn("text-label px-2 py-0.5 rounded-full font-medium", STATUS_STYLE[status] ?? "bg-surface-container text-on-surface-variant")}>
      {status}
    </span>
  );
}

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

const selectClass =
  "bg-surface-container border border-outline-variant text-body-lg text-on-surface rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary";

export default function SuperAdminBillingPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? undefined;
  const [tab, setTab] = useState<Tab>("payments");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = { page, limit: 25, status: status || undefined, orgId };
  const payments = useSAPayments(query);
  const invoices = useSAInvoices(query);
  const active = tab === "payments" ? payments : invoices;
  const data = active.data;
  const rows: any[] = (tab === "payments" ? data?.payments : data?.invoices) ?? [];

  const switchTab = (next: Tab) => {
    setTab(next);
    setStatus("");
    setPage(1);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-title font-semibold text-on-surface">Billing</h1>
        <p className="text-body-lg text-on-surface-variant">
          Payments and invoices across all organizations (read-only).
          {orgId && <> Showing one organization · <Link href="/super-admin/billing" className="text-primary hover:underline">show all</Link></>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Billing records" className="flex gap-1 rounded-lg bg-surface-container/30 p-1">
          {(["payments", "invoices"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              className={cn(
                "rounded-md px-3 py-1.5 text-body font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                tab === t ? "bg-surface-container text-on-surface shadow-sm" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <select
          aria-label={`Filter ${tab} by status`}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className={selectClass}
        >
          {(tab === "payments" ? PAYMENT_STATUSES : INVOICE_STATUSES).map((s) => (
            <option key={s} value={s}>{s || "All statuses"}</option>
          ))}
        </select>
      </div>

      <div role="tabpanel" className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto">
        <table className="w-full text-body-lg">
          <caption className="sr-only">{tab === "payments" ? "Payments" : "Invoices"}, newest first</caption>
          <thead>
            <tr className="border-b border-outline-variant text-left">
              {(tab === "payments"
                ? ["Organization", "Amount", "Status", "Method", "Invoice", "Paid", "Created"]
                : ["Invoice", "Organization", "Amount", "Status", "Period", "Due", "Paid"]
              ).map((h) => (
                <th key={h} scope="col" className="px-4 py-3 text-on-surface-variant font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {active.isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center" role="status">
                  <Spinner className="mx-auto text-primary" />
                  <span className="sr-only">Loading…</span>
                </td>
              </tr>
            ) : !rows.length ? (
              <tr><td colSpan={7} className="py-12 text-center text-on-surface-variant">No {tab} found</td></tr>
            ) : tab === "payments" ? (
              rows.map((p) => (
                <tr key={p.id} className="hover:bg-surface-container transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/super-admin/organizations/${p.organization?.id}`} className="text-on-surface hover:text-primary">
                      {p.organization?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface tabular-nums">{formatMoney(p.amountInCents, p.currency)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} />
                    {p.failedReason && <p className="text-label text-error mt-0.5 max-w-xs truncate" title={p.failedReason}>{p.failedReason}</p>}
                  </td>
                  <td className="px-4 py-3 text-on-surface-variant">{p.paymentMethod ?? "—"}</td>
                  <td className="px-4 py-3 text-on-surface-variant font-mono text-body">{p.invoice?.invoiceNumber ?? "—"}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{fmtDate(p.paidAt)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{fmtDate(p.createdAt)}</td>
                </tr>
              ))
            ) : (
              rows.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-container transition-colors">
                  <td className="px-4 py-3 text-on-surface font-mono text-body">
                    {inv.pdfUrl ? (
                      <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
                        {inv.invoiceNumber}<span className="sr-only"> (PDF, opens in a new tab)</span>
                      </a>
                    ) : inv.invoiceNumber}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/super-admin/organizations/${inv.organization?.id}`} className="text-on-surface hover:text-primary">
                      {inv.organization?.name ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-on-surface tabular-nums">{formatMoney(inv.amountInCents, inv.currency)}</td>
                  <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                  <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{fmtDate(inv.periodStart)} – {fmtDate(inv.periodEnd)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{fmtDate(inv.dueDate)}</td>
                  <td className="px-4 py-3 text-on-surface-variant">{fmtDate(inv.paidAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <span className="text-label text-on-surface-variant">{data.total} total</span>
            <div className="flex items-center gap-2">
              <IconButton size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} aria-label="Previous page">
                <ChevronLeft className="h-4 w-4" aria-hidden />
              </IconButton>
              <span className="text-label text-on-surface-variant">{page} / {data.totalPages}</span>
              <IconButton size="sm" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages} aria-label="Next page">
                <ChevronRight className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
