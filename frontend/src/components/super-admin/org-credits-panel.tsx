"use client";

import { useId, useState } from "react";
import { MinusCircle, PlusCircle, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useSAOrgCredits } from "@/hooks/use-super-admin";
import type { CreditEntry, CreditEntryKind } from "@/lib/api/super-admin";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { formatMoney, parseMoneyInput } from "@/lib/utils";

/** Billing currencies — Razorpay checkout takes INR and USD only */
export const CURRENCIES = ["INR", "USD"];

const KIND_BADGE: Record<CreditEntryKind, { label: string; variant: "success" | "info" | "error" }> = {
  GRANT: { label: "Grant", variant: "success" },
  APPLIED: { label: "Applied", variant: "info" },
  REVOKED: { label: "Revoked", variant: "error" },
};

const inputClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

function signed(minor: number, currency: string) {
  return `${minor > 0 ? "+" : minor < 0 ? "−" : ""}${formatMoney(Math.abs(minor), currency)}`;
}

const ledgerColumns: DataTableColumn<CreditEntry>[] = [
  {
    id: "date",
    header: "Date",
    cellClassName: "text-body-lg text-on-surface-variant whitespace-nowrap",
    cell: (e) => new Date(e.createdAt).toLocaleDateString(),
  },
  {
    id: "type",
    header: "Type",
    skeleton: "badge",
    cell: (e) => <Badge variant={KIND_BADGE[e.kind]?.variant ?? "muted"}>{KIND_BADGE[e.kind]?.label ?? e.kind}</Badge>,
  },
  {
    id: "amount",
    header: "Amount",
    cellClassName: "text-body-lg tabular-nums whitespace-nowrap",
    cell: (e) => (
      <span className={e.amountInCents < 0 ? "text-on-surface-variant" : "text-on-surface"}>{signed(e.amountInCents, e.currency)}</span>
    ),
  },
  {
    id: "reason",
    header: "Reason",
    cellClassName: "text-body-lg text-on-surface-variant max-w-xs truncate",
    cell: (e) => <span title={e.reason}>{e.reason}</span>,
  },
  { id: "invoice", header: "Invoice", cellClassName: "text-on-surface-variant font-mono text-body", cell: (e) => e.invoiceNumber ?? "—" },
];

/** Account credit for one org: balance per currency, ledger, grant and revoke. */
export function OrgCreditsPanel({ orgId, defaultCurrency }: { orgId: string; defaultCurrency?: string }) {
  const { query, grant, revoke } = useSAOrgCredits(orgId);
  const titleId = useId();
  const fieldId = useId();
  const [mode, setMode] = useState<"grant" | "revoke" | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<{ amount?: string; reason?: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const balances = query.data?.balances ?? [];
  const entries = query.data?.entries ?? [];
  const pending = grant.isPending || revoke.isPending;
  const fallbackCurrency = (defaultCurrency || "INR").toUpperCase();
  const currencyOptions = [...new Set([fallbackCurrency, ...CURRENCIES, ...balances.map((b) => b.currency)])];
  const balanceIn = (code: string) => balances.find((b) => b.currency === code)?.balanceInCents ?? 0;

  const open = (next: "grant" | "revoke") => {
    setAmount("");
    setReason("");
    setErrors({});
    setServerError(null);
    // Revoke defaults to a currency that actually has a balance
    const positive = balances.find((b) => b.balanceInCents > 0)?.currency;
    setCurrency(next === "revoke" && balanceIn(fallbackCurrency) <= 0 && positive ? positive : fallbackCurrency);
    setMode(next);
  };
  const close = () => !pending && setMode(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const minor = parseMoneyInput(amount);
    const next: typeof errors = {};
    if (minor === null || minor < 1) next.amount = "Enter an amount greater than zero (max 2 decimals)";
    else if (mode === "revoke" && minor > balanceIn(currency)) {
      next.amount = `Can't exceed the balance of ${formatMoney(balanceIn(currency), currency)}`;
    }
    const trimmed = reason.trim();
    if (trimmed.length < 3) next.reason = "Give a reason (at least 3 characters)";
    else if (trimmed.length > 500) next.reason = "Keep the reason under 500 characters";
    setErrors(next);
    setServerError(null);
    if (Object.keys(next).length || minor === null) return;

    const mutation = mode === "revoke" ? revoke : grant;
    mutation.mutate(
      { amountInCents: minor, currency, reason: trimmed },
      {
        onSuccess: ({ balanceInCents }) => {
          toast.success(
            `${mode === "revoke" ? "Credit revoked" : "Credit granted"} · balance ${formatMoney(balanceInCents, currency)}`,
          );
          setMode(null);
        },
        onError: (err) => setServerError(errorMessage(err, "The action failed")),
      },
    );
  };

  return (
    <section
      aria-labelledby={`${titleId}-panel`}
      className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={`${titleId}-panel`} className="flex items-center gap-2 text-body-lg font-medium text-on-surface">
          <Wallet className="h-4 w-4" aria-hidden /> Credits
        </h2>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => open("grant")}>
            <PlusCircle className="h-4 w-4" aria-hidden /> Grant credit
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={!balances.some((b) => b.balanceInCents > 0)}
            onClick={() => open("revoke")}
          >
            <MinusCircle className="h-4 w-4" aria-hidden /> Revoke
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="py-8 flex justify-center" role="status">
          <Spinner className="text-primary" />
          <span className="sr-only">Loading credits…</span>
        </div>
      ) : query.isError ? (
        <Alert variant="error">
          Could not load credits.{" "}
          <button type="button" onClick={() => query.refetch()} className="underline hover:no-underline">
            Try again
          </button>
        </Alert>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            {balances.length ? (
              balances.map((b) => (
                <div key={b.currency} className="rounded-xl py-1 pr-4 min-w-[140px]">
                  <div className="text-title font-semibold text-on-surface tabular-nums">
                    {formatMoney(b.balanceInCents, b.currency)}
                  </div>
                  <div className="text-label text-on-surface-variant">{b.currency} balance</div>
                </div>
              ))
            ) : (
              <p className="text-body-lg text-on-surface-variant">No credit balance.</p>
            )}
          </div>

          {entries.length > 0 && (
            <div className="border border-outline-variant rounded-lg overflow-x-auto">
              <DataTable label="Credit ledger" columns={ledgerColumns} rows={entries} rowKey={(e) => e.id} />
            </div>
          )}
        </>
      )}

      <Modal open={mode !== null} onClose={close} dismissible={!pending} aria-labelledby={titleId} className="max-w-md">
        {() => (
          <form onSubmit={submit} className="p-6 space-y-4" noValidate>
            <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">
              {mode === "revoke" ? "Revoke credit" : "Grant credit"}
            </h2>
            <p className="text-body text-on-surface-variant">
              {mode === "revoke"
                ? "Removes unused credit from the balance."
                : "Applied automatically to this organization's next invoices in the same currency."}
            </p>

            <div className="grid grid-cols-[1fr_auto] gap-3">
              <div>
                <label htmlFor={`${fieldId}-amount`} className={labelClass}>Amount</label>
                <Input
                  id={`${fieldId}-amount`}
                  autoFocus
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  error={errors.amount}
                  disabled={pending}
                />
              </div>
              <div>
                <label htmlFor={`${fieldId}-currency`} className={labelClass}>Currency</label>
                <select
                  id={`${fieldId}-currency`}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className={`${inputClass} h-10 py-0`}
                  disabled={pending}
                >
                  {currencyOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>
            {mode === "revoke" && (
              <p className="text-label text-on-surface-variant -mt-2">
                Balance: {formatMoney(balanceIn(currency), currency)}
              </p>
            )}

            <div>
              <label htmlFor={`${fieldId}-reason`} className={labelClass}>Reason (recorded in the audit log)</label>
              <textarea
                id={`${fieldId}-reason`}
                rows={3}
                maxLength={500}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className={`${inputClass} resize-none`}
                aria-invalid={!!errors.reason}
                disabled={pending}
              />
              {errors.reason && <p className="mt-1.5 text-caption text-error" role="alert">{errors.reason}</p>}
            </div>

            {serverError && <Alert variant="error">{serverError}</Alert>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
              <Button type="submit" variant={mode === "revoke" ? "destructive" : "primary"} loading={pending}>
                {mode === "revoke" ? "Revoke credit" : "Grant credit"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
