"use client";

import { useId, useState } from "react";
import { Package, Plus, Pencil, ToggleLeft, ToggleRight, X, Check } from "lucide-react";
import { useSAPlans, useSACreatePlan, useSAUpdatePlan } from "@/hooks/use-super-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { IconButton } from "@/components/ui/icon-button";
import type { Plan, BillingCycle } from "@/lib/types/billing";
import { formatMoney } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENCIES = ["INR", "USD"] as const;

function formatLimit(val: number, unit = "") {
  if (val === 0) return "Unlimited";
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k${unit}`;
  return `${val}${unit}`;
}

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return message ?? fallback;
}

const EMPTY_FORM = {
  name: "",
  slug: "",
  description: "",
  billingCycle: "MONTHLY" as BillingCycle,
  priceInCents: 0,
  currency: "INR",
  trialDays: 14,
  maxUsers: 5,
  maxWhatsappSessions: 5,
  maxMessagesPerMonth: 5000,
  maxCampaignsPerMonth: 10,
  campaignsEnabled: true,
  automationEnabled: false,
  apiEnabled: false,
  maxApiCallsPerMonth: 1000,
  aiCreditsPerMonth: 0,
  aiEnabled: false,
  maxMessageTemplates: 10,
  shopifyEnabled: false,
  maxShopifyStores: 0,
  softLimitPercent: 80,
  gracePeriodDays: 3,
  sortOrder: 99,
  isDefault: false,
};

type PlanForm = typeof EMPTY_FORM;

/**
 * Fields the backend accepts on update (UpdatePlanDto). Slug, billing cycle,
 * currency and default are fixed once a plan exists — create a new plan instead.
 */
const UPDATABLE_FIELDS = [
  "name", "description", "priceInCents", "trialDays",
  "maxUsers", "maxWhatsappSessions", "maxMessagesPerMonth", "maxCampaignsPerMonth",
  "campaignsEnabled", "automationEnabled", "apiEnabled", "maxApiCallsPerMonth",
  "aiCreditsPerMonth", "aiEnabled", "maxMessageTemplates", "shopifyEnabled", "maxShopifyStores",
  "softLimitPercent", "gracePeriodDays", "sortOrder",
] as const satisfies readonly (keyof PlanForm)[];

function toUpdatePayload(form: PlanForm): Record<string, unknown> {
  return Object.fromEntries(UPDATABLE_FIELDS.map((k) => [k, form[k]]));
}

function toCreatePayload(form: PlanForm): Record<string, unknown> {
  const { description, ...rest } = form;
  return description.trim() ? { ...rest, description } : rest;
}

function planToForm(plan: Plan): PlanForm {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description ?? "",
    billingCycle: plan.billingCycle,
    priceInCents: plan.priceInCents,
    currency: plan.currency,
    trialDays: plan.trialDays,
    maxUsers: plan.maxUsers,
    maxWhatsappSessions: plan.maxWhatsappSessions,
    maxMessagesPerMonth: plan.maxMessagesPerMonth,
    maxCampaignsPerMonth: plan.maxCampaignsPerMonth,
    campaignsEnabled: plan.campaignsEnabled,
    automationEnabled: plan.automationEnabled,
    apiEnabled: plan.apiEnabled ?? false,
    maxApiCallsPerMonth: plan.maxApiCallsPerMonth ?? 0,
    aiCreditsPerMonth: plan.aiCreditsPerMonth ?? 0,
    aiEnabled: plan.aiEnabled ?? false,
    maxMessageTemplates: plan.maxMessageTemplates ?? 10,
    shopifyEnabled: plan.shopifyEnabled ?? false,
    maxShopifyStores: plan.maxShopifyStores ?? 0,
    softLimitPercent: plan.softLimitPercent,
    gracePeriodDays: plan.gracePeriodDays,
    sortOrder: plan.sortOrder,
    isDefault: plan.isDefault,
  };
}

const inputClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60 disabled:cursor-not-allowed";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

// ─── Plan Form ───────────────────────────────────────────────────────────────

function PlanFormBody({
  initial,
  isEdit,
  titleId,
  error,
  loading,
  onClose,
  onSave,
}: {
  initial: PlanForm;
  isEdit: boolean;
  titleId: string;
  error: string | null;
  loading: boolean;
  onClose: () => void;
  onSave: (data: PlanForm) => void;
}) {
  const uid = useId();
  const fid = (name: string) => `${uid}-${name}`;
  const [form, setForm] = useState<PlanForm>(initial);
  const set = <K extends keyof PlanForm>(field: K, value: PlanForm[K]) =>
    setForm((f) => ({ ...f, [field]: value }));

  const intField = (field: keyof PlanForm) => ({
    id: fid(field),
    type: "number" as const,
    min: 0,
    value: form[field] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(field, (parseInt(e.target.value, 10) || 0) as never),
    className: inputClass,
  });

  const numberFields: [keyof PlanForm, string, boolean][] = [
    ["maxUsers", "Max users", false],
    ["maxWhatsappSessions", "Max WhatsApp sessions", false],
    ["maxMessagesPerMonth", "Max messages / month", true],
    ["maxCampaignsPerMonth", "Max campaigns / month", true],
    ["maxApiCallsPerMonth", "Max API calls / month", true],
    ["aiCreditsPerMonth", "AI credits / month", true],
    ["maxMessageTemplates", "Max templates", true],
    ["maxShopifyStores", "Max Shopify stores", true],
    ["trialDays", "Trial days", false],
    ["sortOrder", "Sort order", false],
  ];

  const featureFields: [keyof PlanForm, string][] = [
    ["campaignsEnabled", "Campaigns"],
    ["automationEnabled", "Automation"],
    ["apiEnabled", "API access"],
    ["aiEnabled", "AI features"],
    ["shopifyEnabled", "Shopify integration"],
  ];

  return (
    <form
      className="p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(form);
      }}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 id={titleId} className="text-title font-semibold text-on-surface">
          {isEdit ? "Edit plan" : "Create plan"}
        </h2>
        <IconButton type="button" size="sm" aria-label="Close dialog" onClick={onClose}>
          <X className="w-5 h-5" aria-hidden />
        </IconButton>
      </div>

      {error && <Alert variant="error" className="mb-4">{error}</Alert>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor={fid("name")} className={labelClass}>Plan name</label>
          <input
            id={fid("name")}
            autoFocus
            required
            className={inputClass}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Starter"
          />
        </div>
        <div>
          <label htmlFor={fid("slug")} className={labelClass}>Slug</label>
          <input
            id={fid("slug")}
            required
            disabled={isEdit}
            aria-describedby={isEdit ? fid("fixed-hint") : undefined}
            className={inputClass}
            value={form.slug}
            onChange={(e) => set("slug", e.target.value.toLowerCase())}
            placeholder="starter"
          />
        </div>
        <div>
          <label htmlFor={fid("cycle")} className={labelClass}>Billing cycle</label>
          <select
            id={fid("cycle")}
            disabled={isEdit}
            className={inputClass}
            value={form.billingCycle}
            onChange={(e) => set("billingCycle", e.target.value as BillingCycle)}
          >
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>
        <div>
          <label htmlFor={fid("currency")} className={labelClass}>Currency</label>
          <select
            id={fid("currency")}
            disabled={isEdit}
            className={inputClass}
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor={fid("price")} className={labelClass}>Price ({form.currency})</label>
          <input
            id={fid("price")}
            type="number"
            min={0}
            step="0.01"
            className={inputClass}
            value={form.priceInCents / 100}
            onChange={(e) => set("priceInCents", Math.round((parseFloat(e.target.value) || 0) * 100))}
            aria-describedby={fid("price-hint")}
          />
          <p id={fid("price-hint")} className="text-label text-on-surface-variant mt-0.5">
            {formatMoney(form.priceInCents, form.currency)} / {form.billingCycle === "MONTHLY" ? "month" : "year"}
          </p>
        </div>

        {numberFields.map(([field, label, zeroUnlimited]) => (
          <div key={field}>
            <label htmlFor={fid(field)} className={labelClass}>
              {label}
              {zeroUnlimited && <span className="text-on-surface-variant font-normal"> (0 = unlimited)</span>}
            </label>
            <input {...intField(field)} />
          </div>
        ))}

        <div className="sm:col-span-2">
          <label htmlFor={fid("description")} className={labelClass}>Description</label>
          <textarea
            id={fid("description")}
            className={`${inputClass} resize-none`}
            rows={2}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <fieldset className="sm:col-span-2">
          <legend className={labelClass}>Features</legend>
          <div className="flex flex-wrap gap-4">
            {featureFields.map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => set(key, e.target.checked as never)}
                  className="h-4 w-4 rounded border-outline accent-primary"
                />
                {label}
              </label>
            ))}
            {!isEdit && (
              <label className="flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => set("isDefault", e.target.checked)}
                  className="h-4 w-4 rounded border-outline accent-primary"
                />
                Default plan for new orgs
              </label>
            )}
          </div>
        </fieldset>

        {isEdit && (
          <p id={fid("fixed-hint")} className="sm:col-span-2 text-label text-on-surface-variant">
            Slug, billing cycle and currency can't change on an existing plan. Changes apply to new
            subscriptions only; existing subscribers keep their locked-in price.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" aria-hidden />}
          Save plan
        </Button>
      </div>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminPlansPage() {
  const { data, isLoading } = useSAPlans();
  const createPlan = useSACreatePlan();
  const updatePlan = useSAUpdatePlan();
  const titleId = useId();

  const allPlans: Plan[] = data?.plans ?? [];
  const [showInactive, setShowInactive] = useState(false);
  const plans = allPlans
    .filter((p) => showInactive || p.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const inactiveCount = allPlans.filter((p) => !p.isActive).length;

  const [modal, setModal] = useState<{ open: boolean; editing: Plan | null }>({ open: false, editing: null });
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const openCreate = () => { setFormError(null); setModal({ open: true, editing: null }); };
  const openEdit = (plan: Plan) => { setFormError(null); setModal({ open: true, editing: plan }); };
  const closeModal = () => setModal({ open: false, editing: null });

  const handleSave = (form: PlanForm) => {
    setFormError(null);
    const onSuccess = () => {
      setStatus({ kind: "success", text: `Plan "${form.name}" saved.` });
      closeModal();
    };
    const onError = (err: unknown) => setFormError(errorMessage(err, "Could not save the plan"));

    if (modal.editing) {
      updatePlan.mutate({ id: modal.editing.id, data: toUpdatePayload(form) }, { onSuccess, onError });
    } else {
      createPlan.mutate(toCreatePayload(form), { onSuccess, onError });
    }
  };

  const handleToggle = (plan: Plan) => {
    setStatus(null);
    updatePlan.mutate(
      { id: plan.id, data: { isActive: !plan.isActive } },
      {
        onSuccess: () =>
          setStatus({ kind: "success", text: `"${plan.name}" ${plan.isActive ? "deactivated" : "activated"}.` }),
        onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not update the plan") }),
      },
    );
  };

  const isSaving = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary-container" aria-hidden />
          </div>
          <div>
            <h1 className="text-title font-semibold text-on-surface">Plan Management</h1>
            <p className="text-body-lg text-on-surface-variant">Create and manage subscription plans</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" aria-hidden />
          New Plan
        </Button>
      </div>

      {status && <Alert variant={status.kind} className="mb-4">{status.text}</Alert>}

      <label className="mb-3 inline-flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer">
        <input
          type="checkbox"
          checked={showInactive}
          onChange={(e) => setShowInactive(e.target.checked)}
          className="h-4 w-4 rounded border-outline accent-primary"
        />
        Show inactive plans ({inactiveCount})
      </label>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-32" role="status">
            <Spinner />
            <span className="sr-only">Loading plans…</span>
          </div>
        ) : !plans.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-on-surface-variant">
            <Package className="w-10 h-10 mb-2 opacity-30" aria-hidden />
            <p className="text-body-lg">
              {allPlans.length ? "No active plans. Show inactive plans to reactivate one." : "No plans yet. Create your first plan."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-lg">
              <caption className="sr-only">Subscription plans</caption>
              <thead>
                <tr className="border-b border-outline-variant text-left">
                  {["Plan", "Cycle", "Price", "Users", "Sessions", "Messages", "Features", "Status", "Actions"].map((h) => (
                    <th key={h} scope="col" className="px-4 py-3 text-label font-medium text-on-surface-variant">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-on-surface">{plan.name}</div>
                      <div className="text-label text-on-surface-variant">{plan.slug} · v{plan.version}</div>
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {plan.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {formatMoney(plan.priceInCents, plan.currency)}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatLimit(plan.maxUsers)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatLimit(plan.maxWhatsappSessions)}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{formatLimit(plan.maxMessagesPerMonth)}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {plan.campaignsEnabled && <Badge variant="muted" className="text-label">Campaigns</Badge>}
                        {plan.automationEnabled && <Badge variant="muted" className="text-label">Auto</Badge>}
                        {plan.apiEnabled && <Badge variant="muted" className="text-label">API</Badge>}
                        {plan.aiEnabled && <Badge variant="muted" className="text-label">AI</Badge>}
                        {plan.shopifyEnabled && <Badge variant="muted" className="text-label">Shopify</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {plan.isActive ? (
                        <Badge className="text-label bg-success-container text-success border-success/30">Active</Badge>
                      ) : (
                        <Badge variant="muted" className="text-label">Inactive</Badge>
                      )}
                      {plan.isDefault && (
                        <Badge className="text-label ml-1 bg-primary/10 text-primary-container border-primary/30">Default</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconButton
                          size="sm"
                          onClick={() => openEdit(plan)}
                          className="hover:text-primary-container hover:bg-primary/10"
                          aria-label={`Edit ${plan.name}`}
                        >
                          <Pencil className="w-4 h-4" aria-hidden />
                        </IconButton>
                        <IconButton
                          size="sm"
                          role="switch"
                          aria-checked={plan.isActive}
                          aria-label={`${plan.name} active`}
                          disabled={updatePlan.isPending}
                          onClick={() => handleToggle(plan)}
                        >
                          {plan.isActive ? (
                            <ToggleRight className="w-4 h-4 text-success" aria-hidden />
                          ) : (
                            <ToggleLeft className="w-4 h-4" aria-hidden />
                          )}
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={modal.open}
        onClose={closeModal}
        dismissible={!isSaving}
        aria-labelledby={titleId}
        className="max-w-2xl"
      >
        {() => (
          <PlanFormBody
            key={modal.editing?.id ?? "new"}
            initial={modal.editing ? planToForm(modal.editing) : EMPTY_FORM}
            isEdit={!!modal.editing}
            titleId={titleId}
            error={formError}
            loading={isSaving}
            onClose={closeModal}
            onSave={handleSave}
          />
        )}
      </Modal>
    </div>
  );
}
