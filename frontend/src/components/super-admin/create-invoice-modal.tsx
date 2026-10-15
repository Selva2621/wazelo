"use client";

import { useId, useState } from "react";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useSAInvoiceActions } from "@/hooks/use-super-admin";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { formatMoney, parseMoneyInput } from "@/lib/utils";
import { CURRENCIES } from "./org-credits-panel";

interface Row {
  key: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

const MAX_ITEMS = 50;
const inputClass =
  "w-full h-10 px-3 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

/** yyyy-mm-dd in local time, `days` from today */
function dateFromToday(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseQty(value: string): number | null {
  return /^\d+$/.test(value.trim()) && Number(value) >= 1 ? Number(value) : null;
}

let nextKey = 1;
const emptyRow = (): Row => ({ key: nextKey++, description: "", quantity: "1", unitPrice: "" });

interface CreateInvoiceModalProps {
  orgId: string;
  orgName: string;
  defaultCurrency?: string;
  open: boolean;
  onClose: () => void;
}

export function CreateInvoiceModal(props: CreateInvoiceModalProps) {
  const titleId = useId();
  const { create } = useSAInvoiceActions();
  const close = () => !create.isPending && props.onClose();
  return (
    <Modal open={props.open} onClose={close} dismissible={!create.isPending} aria-labelledby={titleId} className="max-w-2xl">
      {() => <CreateInvoiceForm {...props} titleId={titleId} create={create} onCancel={close} />}
    </Modal>
  );
}

function CreateInvoiceForm({
  orgId,
  orgName,
  defaultCurrency,
  onClose,
  onCancel,
  titleId,
  create,
}: CreateInvoiceModalProps & {
  titleId: string;
  create: ReturnType<typeof useSAInvoiceActions>["create"];
  onCancel: () => void;
}) {
  const fieldId = useId();
  const fallbackCurrency = (defaultCurrency || "INR").toUpperCase();
  const [rows, setRows] = useState<Row[]>(() => [emptyRow()]);
  const [currency, setCurrency] = useState(fallbackCurrency);
  const [dueDate, setDueDate] = useState(() => dateFromToday(7));
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const parsed = rows.map((r) => ({
    description: r.description.trim(),
    quantity: parseQty(r.quantity),
    unit: parseMoneyInput(r.unitPrice),
  }));
  const rowErrors = parsed.map((p) => ({
    description: !p.description ? "Required" : p.description.length > 200 ? "Max 200 characters" : undefined,
    quantity: p.quantity === null ? "Whole number ≥ 1" : undefined,
    unit: p.unit === null ? "Max 2 decimals" : undefined,
  }));
  const total = parsed.reduce((sum, p) => sum + (p.quantity ?? 0) * (p.unit ?? 0), 0);
  const rowsValid = rowErrors.every((e) => !e.description && !e.quantity && !e.unit);
  const formError = !dueDate
    ? "Pick a due date"
    : note.length > 1000
      ? "Keep the note under 1000 characters"
      : rowsValid && total <= 0
        ? "The total must be greater than zero"
        : null;

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowErrors(true);
    setServerError(null);
    if (!rowsValid || formError) return;
    create.mutate(
      {
        orgId,
        currency,
        // Due at the end of the chosen local day
        dueDate: new Date(`${dueDate}T23:59:59`).toISOString(),
        ...(note.trim() ? { note: note.trim() } : {}),
        lineItems: parsed.map((p) => ({
          description: p.description,
          quantity: p.quantity as number,
          unitAmountInCents: p.unit as number,
        })),
      },
      {
        onSuccess: (inv) => {
          toast.success(`Invoice ${inv.invoiceNumber} created`);
          onClose();
        },
        onError: (err) => setServerError(errorMessage(err, "Could not create the invoice")),
      },
    );
  };

  const pending = create.isPending;

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      <div>
        <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">Create invoice</h2>
        <p className="text-body text-on-surface-variant mt-0.5">{orgName}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${fieldId}-currency`} className={labelClass}>Currency</label>
          <select
            id={`${fieldId}-currency`}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={inputClass}
            disabled={pending}
          >
            {[...new Set([fallbackCurrency, ...CURRENCIES])].map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${fieldId}-due`} className={labelClass}>Due date</label>
          <input
            id={`${fieldId}-due`}
            type="date"
            min={dateFromToday(0)}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className={labelClass}>Line items</legend>
        <div className="hidden sm:grid grid-cols-[1fr_5rem_8rem_2rem] gap-2 text-label text-on-surface-variant">
          <span>Description</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span />
        </div>
        {rows.map((r, i) => {
          const err: Partial<(typeof rowErrors)[number]> = showErrors ? rowErrors[i] : {};
          return (
            <div key={r.key} className="grid grid-cols-[1fr_5rem_8rem_2rem] gap-2 items-start">
              <Input
                aria-label={`Item ${i + 1} description`}
                value={r.description}
                maxLength={200}
                onChange={(e) => update(r.key, { description: e.target.value })}
                error={err.description}
                disabled={pending}
              />
              <Input
                aria-label={`Item ${i + 1} quantity`}
                inputMode="numeric"
                value={r.quantity}
                onChange={(e) => update(r.key, { quantity: e.target.value })}
                error={err.quantity}
                disabled={pending}
              />
              <Input
                aria-label={`Item ${i + 1} unit price`}
                inputMode="decimal"
                placeholder="0.00"
                value={r.unitPrice}
                onChange={(e) => update(r.key, { unitPrice: e.target.value })}
                error={err.unit}
                disabled={pending}
              />
              <IconButton
                type="button"
                size="sm"
                variant="danger"
                className="mt-1"
                aria-label={`Remove item ${i + 1}`}
                disabled={pending || rows.length === 1}
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
              >
                <X className="h-4 w-4" aria-hidden />
              </IconButton>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending || rows.length >= MAX_ITEMS}
            onClick={() => setRows((rs) => [...rs, emptyRow()])}
          >
            <Plus className="h-4 w-4" aria-hidden /> Add item
          </Button>
          <p className="text-body-lg text-on-surface" aria-live="polite">
            Total <span className="font-semibold tabular-nums">{formatMoney(total, currency)}</span>
          </p>
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${fieldId}-note`} className={labelClass}>
          Note <span className="font-normal">(optional)</span>
        </label>
        <textarea
          id={`${fieldId}-note`}
          rows={2}
          maxLength={1000}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className={`${inputClass} h-auto py-2 resize-none`}
          disabled={pending}
        />
      </div>

      {showErrors && formError && <Alert variant="error">{formError}</Alert>}
      {serverError && <Alert variant="error">{serverError}</Alert>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>Cancel</Button>
        <Button type="submit" loading={pending}>Create invoice</Button>
      </div>
    </form>
  );
}
