"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";
import { useSAInvoiceActions, useSAInvoices, useSAPayments, useSARecordPaymentRefund } from "@/hooks/use-super-admin";
import type { PaymentRefund } from "@/lib/api/super-admin";
import { useDebounce } from "@/hooks/use-debounce";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusBadge } from "@/components/super-admin/status-badge";
import { ExportCsvButton } from "@/components/super-admin/export-csv-button";
import { NEWEST_FIRST, nextSort, type ListSort } from "@/components/super-admin/sortable-header";
import { TABLE_CARD, sentenceCase } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";
import { cn, formatMoney } from "@/lib/utils";

type Tab = "payments" | "invoices";

/** Sortable column header → server sort field, per tab (server whitelist) */
const SORT_FIELDS: Record<Tab, Record<string, string>> = {
  payments: { Amount: "amountInCents", Paid: "paidAt", Created: "createdAt" },
  invoices: { Amount: "amountInCents", Created: "createdAt" },
};

const PAYMENT_STATUSES =["", "SUCCEEDED", "PENDING", "PROCESSING", "FAILED", "REFUNDED"];
const INVOICE_STATUSES = ["", "PAID", "OPEN", "DRAFT", "VOID", "UNCOLLECTIBLE"];

function fmtDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

/** Deleted orgs keep their billing history but have no detail page, so no link. */
function OrgCell({ org }: { org?: { id: string; name: string; deletedAt?: string | null } | null }) {
  if (!org) return <span className="text-on-surface-variant">—</span>;
  if (org.deletedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 text-on-surface-variant">
        {org.name}
        <Badge variant="muted">Deleted</Badge>
      </span>
    );
  }
  return (
    <Link href={`/super-admin/organizations/${org.id}`} className="text-on-surface hover:text-primary">
      {org.name}
    </Link>
  );
}

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

interface RefundablePayment {
  id: string;
  amountInCents: number;
  currency: string;
  status: string;
  refunds?: PaymentRefund[];
  organization?: { name: string } | null;
  invoice?: { invoiceNumber?: string } | null;
}

function refundedTotal(p: RefundablePayment) {
  return (p.refunds ?? []).reduce((sum, r) => sum + r.amountInCents, 0);
}

function remainingRefundable(p: RefundablePayment) {
  return Math.max(0, p.amountInCents - refundedTotal(p));
}

const labelClass = "block text-body-lg font-medium text-on-surface-variant mb-1";

function RecordRefundForm({ payment, titleId, onDone }: { payment: RefundablePayment; titleId: string; onDone: () => void }) {
  const record = useSARecordPaymentRefund();
  const remaining = remainingRefundable(payment);
  const [amount, setAmount] = useState((remaining / 100).toFixed(2));
  const [reason, setReason] = useState("");
  const [externalId, setExternalId] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string; externalId?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const refunds = payment.refunds ?? [];
  const money = (minor: number) => formatMoney(minor, payment.currency);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    const minor = Math.round(value * 100);
    const next: typeof errors = {};
    if (!amount.trim() || !Number.isFinite(value) || minor < 1) next.amount = "Enter an amount greater than zero";
    else if (minor > remaining) next.amount = `Can't exceed the remaining ${money(remaining)}`;
    const trimmedReason = reason.trim();
    if (trimmedReason.length < 3) next.reason = "Give a reason (at least 3 characters)";
    else if (trimmedReason.length > 500) next.reason = "Keep the reason under 500 characters";
    const trimmedId = externalId.trim();
    if (trimmedId.length > 255) next.externalId = "Refund ID is too long (max 255 characters)";
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length) return;

    record.mutate(
      {
        paymentId: payment.id,
        body: { amountInCents: minor, reason: trimmedReason, ...(trimmedId ? { externalRefundId: trimmedId } : {}) },
      },
      {
        onSuccess: ({ fullyRefunded }) => {
          toast.success("Refund recorded" + (fullyRefunded ? " — payment fully refunded" : ""));
          onDone();
        },
        onError: (err) => setServerError(errorMessage(err, "Could not record the refund")),
      },
    );
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      <div>
        <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">Record a refund</h2>
        <p className="text-body text-on-surface-variant mt-0.5">
          {payment.organization?.name ?? "Payment"} · {money(payment.amountInCents)}
          {payment.invoice?.invoiceNumber && <> · <span className="font-mono">{payment.invoice.invoiceNumber}</span></>}
        </p>
      </div>

      <Alert variant="info">
        Refund the customer in the Razorpay/Stripe dashboard first. This only records it here — no money is moved.
      </Alert>

      <div>
        <label htmlFor="refund-amount" className={labelClass}>Amount ({payment.currency.toUpperCase()})</label>
        <Input
          id="refund-amount"
          type="number"
          inputMode="decimal"
          min={0.01}
          max={remaining / 100}
          step={0.01}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={errors.amount}
          disabled={record.isPending}
        />
        <p className="text-label text-on-surface-variant mt-1">Remaining refundable: {money(remaining)}</p>
      </div>

      <div>
        <label htmlFor="refund-reason" className={labelClass}>Reason</label>
        <Input
          id="refund-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          placeholder="e.g. Duplicate charge"
          error={errors.reason}
          disabled={record.isPending}
        />
      </div>

      <div>
        <label htmlFor="refund-external-id" className={labelClass}>
          Gateway refund ID <span className="font-normal">(optional)</span>
        </label>
        <Input
          id="refund-external-id"
          value={externalId}
          onChange={(e) => setExternalId(e.target.value)}
          maxLength={255}
          placeholder="e.g. rfnd_ABC123"
          className="font-mono"
          error={errors.externalId}
          disabled={record.isPending}
        />
      </div>

      {refunds.length > 0 && (
        <div>
          <h3 className="text-body-lg font-medium text-on-surface-variant mb-1">Previous refunds</h3>
          <ul className="divide-y divide-outline-variant/60">
            {refunds.map((r) => (
              <li key={r.id} className="py-2 text-body">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-on-surface tabular-nums">{money(r.amountInCents)}</span>
                  <span className="text-label text-on-surface-variant">{fmtDate(r.createdAt)}</span>
                </div>
                <p className="text-on-surface-variant truncate" title={r.reason}>{r.reason}</p>
                {r.externalRefundId && (
                  <p className="text-label text-on-surface-variant font-mono truncate">{r.externalRefundId}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={record.isPending}>Cancel</Button>
        <Button type="submit" loading={record.isPending}>Record refund</Button>
      </div>
    </form>
  );
}

function RefundSummary({ payment }: { payment: RefundablePayment }) {
  const refunded = refundedTotal(payment);
  if (refunded <= 0) return null;
  const label = `Refunded ${formatMoney(refunded, payment.currency)}`;
  if (refunded < payment.amountInCents) {
    return (
      <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
        <Badge variant="warning">Partly refunded</Badge>
        <span className="text-label text-on-surface-variant">{label}</span>
      </span>
    );
  }
  return <p className="text-label text-on-surface-variant mt-0.5">{label}</p>;
}

interface InvoiceTarget {
  id: string;
  invoiceNumber: string;
  amountInCents: number;
  currency: string;
}

const textareaClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 resize-none";

/** Mark paid (optional note) and void (required reason) for OPEN/DRAFT invoices. */
function InvoiceActionDialogs({
  target,
  mode,
  onDone,
}: {
  target: InvoiceTarget | null;
  mode: "paid" | "void" | null;
  onDone: () => void;
}) {
  const actions = useSAInvoiceActions();
  const fieldId = useId();
  const [text, setText] = useState("");
  const [prevKey, setPrevKey] = useState<string | null>(null);
  const key = target && mode ? `${mode}:${target.id}` : null;
  if (key !== prevKey) {
    setPrevKey(key);
    setText("");
  }
  const pending = actions.markPaid.isPending || actions.void.isPending;
  const trimmed = text.trim();
  const label = target ? `${target.invoiceNumber} · ${formatMoney(target.amountInCents, target.currency)}` : "";

  const confirm = () => {
    if (!target) return;
    const onError = (err: unknown) => toast.error(errorMessage(err, "The action failed"));
    if (mode === "paid") {
      actions.markPaid.mutate(
        { id: target.id, note: trimmed || undefined },
        { onSuccess: () => { toast.success(`${target.invoiceNumber} marked paid`); onDone(); }, onError },
      );
    } else if (mode === "void") {
      actions.void.mutate(
        { id: target.id, reason: trimmed },
        { onSuccess: () => { toast.success(`${target.invoiceNumber} voided`); onDone(); }, onError },
      );
    }
  };

  return (
    <>
      <ConfirmDialog
        open={mode === "paid" && !!target}
        title="Mark invoice paid?"
        message={`${label}. Use this for payments received outside the gateway.`}
        confirmLabel="Mark paid"
        variant="default"
        loading={pending}
        confirmDisabled={trimmed.length > 500}
        onConfirm={confirm}
        onCancel={onDone}
      >
        <label htmlFor={`${fieldId}-note`} className={labelClass}>
          Note <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id={`${fieldId}-note`}
          rows={2}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. Bank transfer ref"
          className={textareaClass}
        />
      </ConfirmDialog>
      <ConfirmDialog
        open={mode === "void" && !!target}
        title="Void invoice?"
        message={`${label}. It can't be paid afterwards.`}
        confirmLabel="Void invoice"
        variant="danger"
        loading={pending}
        confirmDisabled={trimmed.length < 3 || trimmed.length > 500}
        onConfirm={confirm}
        onCancel={onDone}
      >
        <label htmlFor={`${fieldId}-reason`} className={labelClass}>Reason</label>
        <textarea
          id={`${fieldId}-reason`}
          rows={2}
          maxLength={500}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className={textareaClass}
        />
      </ConfirmDialog>
    </>
  );
}

export default function SuperAdminBillingPage() {
  const searchParams = useSearchParams();
  const orgId = searchParams.get("orgId") ?? undefined;
  const [tab, setTab] = useState<Tab>("payments");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [refundTarget, setRefundTarget] = useState<RefundablePayment | null>(null);
  const [invoiceTarget, setInvoiceTarget] = useState<InvoiceTarget | null>(null);
  const [invoiceMode, setInvoiceMode] = useState<"paid" | "void" | null>(null);
  const openInvoiceAction = (inv: InvoiceTarget, mode: "paid" | "void") => {
    setInvoiceTarget(inv);
    setInvoiceMode(mode);
  };
  const refundTitleId = useId();
  const debouncedSearch = useDebounce(search.trim(), 350);
  // A cleared box (e.g. on tab switch) applies at once instead of waiting out the debounce
  const searchTerm = search.trim() ? debouncedSearch : "";

  // Back to the first page whenever the settled search term changes
  const [prevSearch, setPrevSearch] = useState(searchTerm);
  if (prevSearch !== searchTerm) {
    setPrevSearch(searchTerm);
    setPage(1);
  }

  const [sort, setSort] = useState<ListSort>(NEWEST_FIRST);
  const changeSort = (next: ListSort) => { setSort(next); setPage(1); };

  const filters = { status: status || undefined, orgId, search: searchTerm || undefined, sort: sort.field, order: sort.order };
  const query = { page, limit: 25, ...filters };
  // Only the visible tab fetches: each tab has its own status values
  const payments = useSAPayments(query, tab === "payments");
  const invoices = useSAInvoices(query, tab === "invoices");
  const active = tab === "payments" ? payments : invoices;
  const data = active.data;
  const rows: any[] = (tab === "payments" ? data?.payments : data?.invoices) ?? [];

  const paymentColumns: DataTableColumn<(typeof rows)[number]>[] = [
    { id: "organization", header: "Organization", cell: (p) => <OrgCell org={p.organization} /> },
    {
      id: SORT_FIELDS.payments.Amount,
      header: "Amount",
      sortable: true,
      cellClassName: "text-on-surface tabular-nums",
      cell: (p) => (
        <>
          {formatMoney(p.amountInCents, p.currency)}
          <RefundSummary payment={p} />
        </>
      ),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (p) => (
        <>
          <StatusBadge status={p.status} />
          {p.failedReason && <p className="text-label text-error mt-0.5 max-w-xs truncate" title={p.failedReason}>{p.failedReason}</p>}
        </>
      ),
    },
    { id: "method", header: "Method", cellClassName: "text-on-surface-variant", cell: (p) => p.paymentMethod ?? "—" },
    { id: "invoice", header: "Invoice", cellClassName: "text-on-surface-variant font-mono text-body", cell: (p) => p.invoice?.invoiceNumber ?? "—" },
    { id: SORT_FIELDS.payments.Paid, header: "Paid", sortable: true, cellClassName: "text-on-surface-variant", cell: (p) => fmtDate(p.paidAt) },
    { id: SORT_FIELDS.payments.Created, header: "Created", sortable: true, cellClassName: "text-on-surface-variant", cell: (p) => fmtDate(p.createdAt) },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (p) =>
        p.status === "SUCCEEDED" && remainingRefundable(p) > 0 && (
          <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => setRefundTarget(p)}>
            Record refund
          </Button>
        ),
    },
  ];

  const invoiceColumns: DataTableColumn<(typeof rows)[number]>[] = [
    {
      id: "invoice",
      header: "Invoice",
      cellClassName: "text-on-surface font-mono text-body",
      cell: (inv) => (
        <>
          {inv.pdfUrl ? (
            <a href={inv.pdfUrl} target="_blank" rel="noreferrer" className="hover:text-primary">
              {inv.invoiceNumber}<span className="sr-only"> (PDF, opens in a new tab)</span>
            </a>
          ) : inv.invoiceNumber}
          {inv.metadata?.manual === true && <Badge variant="info" className="ml-1.5 font-sans">Manual</Badge>}
        </>
      ),
    },
    { id: "organization", header: "Organization", cell: (inv) => <OrgCell org={inv.organization} /> },
    {
      id: SORT_FIELDS.invoices.Amount,
      header: "Amount",
      sortable: true,
      cellClassName: "text-on-surface tabular-nums",
      cell: (inv) => formatMoney(inv.amountInCents, inv.currency),
    },
    { id: "status", header: "Status", skeleton: "badge", cell: (inv) => <StatusBadge status={inv.status} /> },
    {
      id: "period",
      header: "Period",
      cellClassName: "text-on-surface-variant whitespace-nowrap",
      cell: (inv) => (inv.periodStart || inv.periodEnd ? `${fmtDate(inv.periodStart)} – ${fmtDate(inv.periodEnd)}` : "—"),
    },
    { id: "due", header: "Due", cellClassName: "text-on-surface-variant", cell: (inv) => fmtDate(inv.dueDate) },
    { id: "paid", header: "Paid", cellClassName: "text-on-surface-variant", cell: (inv) => fmtDate(inv.paidAt) },
    { id: SORT_FIELDS.invoices.Created, header: "Created", sortable: true, cellClassName: "text-on-surface-variant", cell: (inv) => fmtDate(inv.createdAt) },
    {
      id: "actions",
      header: "Actions",
      hideHeader: true,
      align: "right",
      skeleton: "none",
      cell: (inv) =>
        (inv.status === "OPEN" || inv.status === "DRAFT") && (
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="secondary" className="whitespace-nowrap" onClick={() => openInvoiceAction(inv, "paid")}>
              Mark paid
            </Button>
            <Button size="sm" variant="ghost" className="text-error" onClick={() => openInvoiceAction(inv, "void")}>
              Void
            </Button>
          </div>
        ),
    },
  ];

  const switchTab = (next: Tab) => {
    setTab(next);
    setStatus("");
    setSearch("");
    setSort(NEWEST_FIRST);
    setPage(1);
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Billing"
        count={data?.total}
        description={
          orgId ? (
            <>One organization · <Link href="/super-admin/billing" className="text-primary hover:underline">show all</Link></>
          ) : undefined
        }
        actions={<ExportCsvButton list={tab} params={filters} />}
      />

      <FilterBar>
        <div role="tablist" aria-label="Billing records" className="inline-flex rounded-lg border border-outline-variant p-0.5">
          {(["payments", "invoices"] as const).map((t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              onClick={() => switchTab(t)}
              className={cn(
                "rounded-md px-3 py-1 text-body capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
                tab === t ? "bg-primary/10 text-primary font-medium" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {t}
            </button>
          ))}
        </div>
        <FilterBarDivider />
        <SearchInput
          aria-label={`Search ${tab} by organization or invoice number`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search organization or invoice #…"
          className="w-full sm:max-w-xs"
        />
        <FilterSelect
          label={`Filter ${tab} by status`}
          active={!!status}
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
        >
          {(tab === "payments" ? PAYMENT_STATUSES : INVOICE_STATUSES).map((s) => (
            <option key={s} value={s}>{s ? sentenceCase(s) : "All statuses"}</option>
          ))}
        </FilterSelect>
      </FilterBar>

      <div role="tabpanel" className={TABLE_CARD}>
        <DataTable
          key={tab}
          label={tab === "payments" ? "Payments" : "Invoices"}
          columns={tab === "payments" ? paymentColumns : invoiceColumns}
          rows={rows}
          rowKey={(r) => r.id}
          loading={active.isLoading}
          error={active.isError}
          onRetry={() => active.refetch()}
          empty={{
            icon: tab === "payments" ? <CreditCard className="h-12 w-12" /> : <FileText className="h-12 w-12" />,
            title: searchTerm ? `No ${tab} match “${searchTerm}”` : `No ${tab} found`,
            description: searchTerm ? "Try a different organization or invoice number." : "Try changing the status filter.",
          }}
          sort={{ id: sort.field, order: sort.order }}
          onSortChange={(next) => changeSort(nextSort(sort, next.id))}
          pagination={data ? { page: page - 1, pageSize: 25, total: data.total, onPageChange: (p) => setPage(p + 1) } : undefined}
        />
      </div>

      <Modal
        open={!!refundTarget}
        onClose={() => setRefundTarget(null)}
        aria-labelledby={refundTitleId}
        className="max-w-md"
      >
        {() =>
          refundTarget && (
            <RecordRefundForm payment={refundTarget} titleId={refundTitleId} onDone={() => setRefundTarget(null)} />
          )
        }
      </Modal>

      <InvoiceActionDialogs
        target={invoiceTarget}
        mode={invoiceMode}
        onDone={() => setInvoiceMode(null)}
      />
    </div>
  );
}
