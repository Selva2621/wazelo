"use client";

import { useId, useState } from "react";
import { Plus, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { useSACouponActions, useSACoupons, useSAPlans } from "@/hooks/use-super-admin";
import type { Coupon, CouponKind, CreateCouponBody } from "@/lib/api/super-admin";
import type { Plan } from "@/lib/types/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CURRENCIES } from "@/components/super-admin/org-credits-panel";
import { TABLE_CARD, TH, TR } from "@/components/super-admin/list-styles";
import { PageHeader } from "@/components/layout/page-header";
import { cn, formatMoney, parseMoneyInput } from "@/lib/utils";

const CODE_PATTERN = /^[A-Z0-9_-]{3,40}$/;
const inputClass =
  "w-full h-10 px-3 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

function fmtDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "";
}

type CouponState = "Active" | "Inactive" | "Expired" | "Exhausted";

function couponState(c: Coupon): CouponState {
  if (!c.active) return "Inactive";
  if (c.validUntil && new Date(c.validUntil).getTime() < Date.now()) return "Expired";
  if (c.maxRedemptions !== null && c.redemptionCount >= c.maxRedemptions) return "Exhausted";
  return "Active";
}

const STATE_VARIANT: Record<CouponState, "success" | "muted" | "warning"> = {
  Active: "success",
  Inactive: "muted",
  Expired: "muted",
  Exhausted: "warning",
};

function discountLabel(c: Coupon) {
  if (c.kind === "PERCENT") return `${c.percentOff ?? 0}%`;
  return formatMoney(c.amountOffInCents ?? 0, c.currency ?? "INR");
}

function validityLabel(c: Coupon) {
  if (c.validFrom && c.validUntil) return `${fmtDate(c.validFrom)} – ${fmtDate(c.validUntil)}`;
  if (c.validFrom) return `From ${fmtDate(c.validFrom)}`;
  if (c.validUntil) return `Until ${fmtDate(c.validUntil)}`;
  return "Always";
}

interface CouponForm {
  code: string;
  kind: CouponKind;
  percentOff: string;
  amountOff: string;
  currency: string;
  maxRedemptions: string;
  validFrom: string;
  validUntil: string;
  planIds: string[];
}

const EMPTY_FORM: CouponForm = {
  code: "",
  kind: "PERCENT",
  percentOff: "",
  amountOff: "",
  currency: "INR",
  maxRedemptions: "",
  validFrom: "",
  validUntil: "",
  planIds: [],
};

type FormErrors = Partial<Record<"code" | "percentOff" | "amountOff" | "maxRedemptions" | "validUntil", string>>;

function validate(form: CouponForm): { errors: FormErrors; body?: CreateCouponBody } {
  const errors: FormErrors = {};
  const code = form.code.trim().toUpperCase();
  if (!CODE_PATTERN.test(code)) errors.code = "3–40 characters: A–Z, 0–9, _ or -";

  const body: CreateCouponBody = { code, kind: form.kind };
  if (form.kind === "PERCENT") {
    const pct = /^\d+$/.test(form.percentOff.trim()) ? Number(form.percentOff) : NaN;
    if (!(pct >= 1 && pct <= 100)) errors.percentOff = "Whole number from 1 to 100";
    else body.percentOff = pct;
  } else {
    const minor = parseMoneyInput(form.amountOff);
    if (minor === null || minor < 1) errors.amountOff = "Amount greater than zero (max 2 decimals)";
    else {
      body.amountOffInCents = minor;
      body.currency = form.currency;
    }
  }

  if (form.maxRedemptions.trim()) {
    const max = /^\d+$/.test(form.maxRedemptions.trim()) ? Number(form.maxRedemptions) : 0;
    if (max < 1) errors.maxRedemptions = "Whole number ≥ 1, or leave empty";
    else body.maxRedemptions = max;
  }

  // Dates are local days: valid from the start of the first, until the end of the last
  if (form.validFrom) body.validFrom = new Date(`${form.validFrom}T00:00:00`).toISOString();
  if (form.validUntil) body.validUntil = new Date(`${form.validUntil}T23:59:59`).toISOString();
  if (form.validFrom && form.validUntil && form.validUntil < form.validFrom) {
    errors.validUntil = "Must be on or after the start date";
  }
  if (form.planIds.length) body.appliesToPlanIds = form.planIds;

  return Object.keys(errors).length ? { errors } : { errors, body };
}

function NewCouponForm({ titleId, onDone }: { titleId: string; onDone: () => void }) {
  const fieldId = useId();
  const { create } = useSACouponActions();
  const { data: plansData } = useSAPlans();
  const plans: Plan[] = ((plansData?.plans ?? []) as (Plan & { archivedAt?: string | null })[]).filter(
    (p) => !p.archivedAt && p.priceInCents > 0,
  );
  const [form, setForm] = useState<CouponForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const pending = create.isPending;
  const set = <K extends keyof CouponForm>(key: K, value: CouponForm[K]) => setForm((f) => ({ ...f, [key]: value }));
  const togglePlan = (id: string) =>
    set("planIds", form.planIds.includes(id) ? form.planIds.filter((p) => p !== id) : [...form.planIds, id]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validate(form);
    setErrors(result.errors);
    setServerError(null);
    if (!result.body) return;
    create.mutate(result.body, {
      onSuccess: (c) => {
        toast.success(`Coupon ${c.code} created`);
        onDone();
      },
      onError: (err) => {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 409) setErrors({ code: "This code already exists" });
        else setServerError(errorMessage(err, "Could not create the coupon"));
      },
    });
  };

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      <div>
        <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">New coupon</h2>
        <p className="text-body text-on-surface-variant mt-0.5">First payment only.</p>
      </div>

      <div>
        <label htmlFor={`${fieldId}-code`} className={labelClass}>Code</label>
        <Input
          id={`${fieldId}-code`}
          autoFocus
          value={form.code}
          maxLength={40}
          onChange={(e) => set("code", e.target.value.toUpperCase().replace(/\s/g, ""))}
          placeholder="e.g. LAUNCH20"
          className="font-mono"
          error={errors.code}
          disabled={pending}
        />
      </div>

      <div role="radiogroup" aria-label="Discount type" className="inline-flex rounded-lg border border-outline-variant p-0.5">
        {(["PERCENT", "FIXED"] as const).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={form.kind === k}
            onClick={() => set("kind", k)}
            disabled={pending}
            className={cn(
              "rounded-md px-3 py-1.5 text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus",
              form.kind === k ? "bg-primary/10 text-primary font-medium" : "text-on-surface-variant hover:text-on-surface",
            )}
          >
            {k === "PERCENT" ? "Percentage" : "Fixed amount"}
          </button>
        ))}
      </div>

      {form.kind === "PERCENT" ? (
        <div>
          <label htmlFor={`${fieldId}-pct`} className={labelClass}>Percent off</label>
          <Input
            id={`${fieldId}-pct`}
            inputMode="numeric"
            value={form.percentOff}
            onChange={(e) => set("percentOff", e.target.value)}
            placeholder="20"
            error={errors.percentOff}
            disabled={pending}
          />
        </div>
      ) : (
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <label htmlFor={`${fieldId}-amt`} className={labelClass}>Amount off</label>
            <Input
              id={`${fieldId}-amt`}
              inputMode="decimal"
              value={form.amountOff}
              onChange={(e) => set("amountOff", e.target.value)}
              placeholder="0.00"
              error={errors.amountOff}
              disabled={pending}
            />
          </div>
          <div>
            <label htmlFor={`${fieldId}-cur`} className={labelClass}>Currency</label>
            <select
              id={`${fieldId}-cur`}
              value={form.currency}
              onChange={(e) => set("currency", e.target.value)}
              className={inputClass}
              disabled={pending}
            >
              {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor={`${fieldId}-max`} className={labelClass}>Max redemptions</label>
          <Input
            id={`${fieldId}-max`}
            inputMode="numeric"
            value={form.maxRedemptions}
            onChange={(e) => set("maxRedemptions", e.target.value)}
            placeholder="Unlimited"
            error={errors.maxRedemptions}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-from`} className={labelClass}>Valid from</label>
          <input
            id={`${fieldId}-from`}
            type="date"
            value={form.validFrom}
            onChange={(e) => set("validFrom", e.target.value)}
            className={inputClass}
            disabled={pending}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-until`} className={labelClass}>Valid until</label>
          <Input
            id={`${fieldId}-until`}
            type="date"
            min={form.validFrom || undefined}
            value={form.validUntil}
            onChange={(e) => set("validUntil", e.target.value)}
            error={errors.validUntil}
            disabled={pending}
          />
        </div>
      </div>

      <fieldset>
        <legend className={labelClass}>Plans</legend>
        <p className="text-label text-on-surface-variant mb-2">None selected = all plans.</p>
        {plans.length ? (
          <div className="max-h-40 overflow-y-auto rounded-lg border border-outline-variant divide-y divide-outline-variant/40">
            {plans.map((p) => (
              <label key={p.id} className="flex items-center gap-2 px-3 py-2 text-body-lg text-on-surface cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.planIds.includes(p.id)}
                  onChange={() => togglePlan(p.id)}
                  disabled={pending}
                  className="accent-primary"
                />
                <span className="flex-1">{p.name}</span>
                <span className="text-label text-on-surface-variant">
                  {formatMoney(p.priceInCents, p.currency)}/{p.billingCycle === "YEARLY" ? "yr" : "mo"}
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-body text-on-surface-variant">No paid plans.</p>
        )}
      </fieldset>

      {serverError && <Alert variant="error">{serverError}</Alert>}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onDone} disabled={pending}>Cancel</Button>
        <Button type="submit" loading={pending}>Create coupon</Button>
      </div>
    </form>
  );
}

export default function SuperAdminCouponsPage() {
  const { data: coupons, isLoading, isError, refetch } = useSACoupons();
  const { deactivate } = useSACouponActions();
  const titleId = useId();
  const [creating, setCreating] = useState(false);
  const [deactivating, setDeactivating] = useState<Coupon | null>(null);
  const rows = coupons ?? [];

  const confirmDeactivate = (c: Coupon) =>
    deactivate.mutate(c.id, {
      onSuccess: () => toast.success(`${c.code} deactivated`),
      onError: (err) => toast.error(errorMessage(err, "Could not deactivate the coupon")),
      onSettled: () => setDeactivating(null),
    });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <PageHeader
        title="Coupons"
        count={coupons?.length}
        description="First payment only"
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" aria-hidden /> New coupon
          </Button>
        }
      />

      <div className={TABLE_CARD}>
        {isLoading ? (
          <div className="py-12 flex justify-center" role="status">
            <Spinner className="text-primary" />
            <span className="sr-only">Loading…</span>
          </div>
        ) : isError ? (
          <p className="py-12 text-center text-error" role="alert">
            Could not load coupons.{" "}
            <button type="button" onClick={() => refetch()} className="underline hover:no-underline">Try again</button>
          </p>
        ) : !rows.length ? (
          <EmptyState
            icon={<TicketPercent className="h-10 w-10" aria-hidden />}
            title="No coupons yet"
            description="Create a code to discount a first payment."
            actionLabel="New coupon"
            onAction={() => setCreating(true)}
          />
        ) : (
          <table className="w-full text-body">
            <caption className="sr-only">Coupons</caption>
            <thead>
              <tr className="border-b border-outline-variant text-left">
                {["Code", "Discount", "Plans", "Redemptions", "Valid", "Status", "Actions"].map((h) => (
                  <th key={h} scope="col" className={TH}>
                    {h === "Actions" ? <span className="sr-only">{h}</span> : h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/60">
              {rows.map((c) => {
                const state = couponState(c);
                return (
                  <tr key={c.id} className={TR}>
                    <td className="px-4 py-3 font-mono text-body text-on-surface">{c.code}</td>
                    <td className="px-4 py-3 text-on-surface tabular-nums">{discountLabel(c)}</td>
                    <td className="px-4 py-3 text-on-surface-variant max-w-xs truncate" title={c.plans.map((p) => p.name).join(", ")}>
                      {c.plans.length ? c.plans.map((p) => p.name).join(", ") : "All plans"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                      {c.redemptionCount} / {c.maxRedemptions ?? "∞"}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">{validityLabel(c)}</td>
                    <td className="px-4 py-3"><Badge variant={STATE_VARIANT[state]}>{state}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      {c.active && (
                        <Button size="sm" variant="ghost" className="text-error" onClick={() => setDeactivating(c)}>
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        aria-labelledby={titleId}
        className="max-w-lg"
      >
        {() => <NewCouponForm titleId={titleId} onDone={() => setCreating(false)} />}
      </Modal>

      <ConfirmDialog
        open={!!deactivating}
        title={`Deactivate ${deactivating?.code ?? ""}?`}
        message="The code stops working for new checkouts. This can't be undone."
        confirmLabel="Deactivate"
        variant="danger"
        loading={deactivate.isPending}
        onConfirm={() => deactivating && confirmDeactivate(deactivating)}
        onCancel={() => setDeactivating(null)}
      />
    </div>
  );
}
