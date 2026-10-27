"use client";

import { useId, useState } from "react";
import { Package, Plus, Pencil, ToggleLeft, ToggleRight, X, Check, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useSAPlans, useSACreatePlan, useSAUpdatePlan, useSAPlanLifecycle } from "@/hooks/use-super-admin";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { TABLE_CARD } from "@/components/super-admin/list-styles";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IconButton } from "@/components/ui/icon-button";
import type { Plan, BillingCycle } from "@/lib/types/billing";
import type { PlanEditMode, PlanUpdateResult } from "@/lib/api/super-admin";
import { cn, formatMoney } from "@/lib/utils";

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

/**
 * Mirrors the backend rule (super-admin plan-edit.ts): these never change what an existing
 * subscriber gets — price and trial are locked on each subscription when it starts.
 */
const NEW_SIGNUPS_ONLY = new Set<string>(["name", "description", "priceInCents", "trialDays", "sortOrder"]);

/** Changed fields that would alter existing subscribers' limits or features. */
function subscriberAffectingChanges(before: PlanForm, after: PlanForm): string[] {
  return UPDATABLE_FIELDS.filter((k) => !NEW_SIGNUPS_ONLY.has(k) && before[k] !== after[k]);
}

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
          {!isEdit && (
            <p className="text-label text-on-surface-variant mt-0.5">
              INR plans are shown to orgs in India, USD plans to everyone else. A USD plan needs its own
              slug (e.g. starter-usd) and Razorpay International Payments switched on.
            </p>
          )}
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
            Slug, billing cycle and currency can&apos;t change on an existing plan. Existing subscribers keep
            their locked-in price. If you change limits or features, you&apos;ll choose whether they apply to
            existing subscribers or only to a new version.
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

// ─── Edit choice ─────────────────────────────────────────────────────────────

function PlanEditChoiceBody({
  plan,
  changedCount,
  loading,
  onCancel,
  onConfirm,
}: {
  plan: Plan;
  changedCount: number;
  loading: boolean;
  onCancel: () => void;
  onConfirm: (mode: PlanEditMode) => void;
}) {
  const [mode, setMode] = useState<PlanEditMode>("new_version");
  const subs = plan.liveSubscribers ?? 0;
  const who = `${subs} subscriber${subs === 1 ? "" : "s"}`;
  const options: { value: PlanEditMode; title: string; detail: string }[] = [
    {
      value: "new_version",
      title: `Publish as v${plan.version + 1}`,
      detail: `New sign-ups get the new limits. The ${who} on v${plan.version} keep their current limits; v${plan.version} is retired from sale.`,
    },
    {
      value: "apply_to_all",
      title: `Apply to all ${who} now`,
      detail: "Their limits and features change immediately.",
    },
  ];

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 id="plan-choice-title" className="text-title-sm font-semibold text-on-surface">
          {plan.name} has {who}
        </h2>
        <p className="text-body text-on-surface-variant mt-1">
          You changed {changedCount} limit or feature setting{changedCount === 1 ? "" : "s"}. Existing prices stay
          the same either way.
        </p>
      </div>
      <fieldset className="space-y-2">
        <legend className="sr-only">How to apply this change</legend>
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex gap-3 rounded-lg border p-3 cursor-pointer ${
              mode === o.value ? "border-primary bg-primary/5" : "border-outline-variant"
            }`}
          >
            <input
              type="radio"
              name="plan-edit-mode"
              value={o.value}
              checked={mode === o.value}
              onChange={() => setMode(o.value)}
              className="mt-1 h-4 w-4 accent-primary"
            />
            <span>
              <span className="block text-body-lg font-medium text-on-surface">{o.title}</span>
              <span className="block text-body text-on-surface-variant">{o.detail}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Back to editing</Button>
        <Button onClick={() => onConfirm(mode)} loading={loading}>
          {mode === "new_version" ? "Publish new version" : "Apply to all"}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminPlansPage() {
  const { data, isLoading, isError, refetch } = useSAPlans();
  const createPlan = useSACreatePlan();
  const updatePlan = useSAUpdatePlan();
  const titleId = useId();

  const allPlans: Plan[] = data?.plans ?? [];
  const [showInactive, setShowInactive] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const plans = allPlans
    .filter((p) => (p.archivedAt ? showArchived : showInactive || p.isActive))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const inactiveCount = allPlans.filter((p) => !p.isActive && !p.archivedAt).length;
  const archivedCount = allPlans.filter((p) => p.archivedAt).length;

  const lifecycle = useSAPlanLifecycle();
  /** Plans waiting for the archive / delete confirmation */
  const [archiving, setArchiving] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState<Plan | null>(null);
  const lifecycleBusy = lifecycle.archive.isPending || lifecycle.unarchive.isPending || lifecycle.remove.isPending;

  const confirmArchive = (plan: Plan) => {
    lifecycle.archive.mutate(plan.id, {
      onSuccess: () => toast.success(`"${plan.name}" archived.`),
      onError: (err) => toast.error(errorMessage(err, "Could not archive the plan")),
      onSettled: () => setArchiving(null),
    });
  };

  const handleUnarchive = (plan: Plan) => {
    lifecycle.unarchive.mutate(plan.id, {
      onSuccess: () => toast.success(`"${plan.name}" unarchived. It stays inactive until you activate it.`),
      onError: (err) => toast.error(errorMessage(err, "Could not unarchive the plan")),
    });
  };

  const confirmDelete = (plan: Plan) => {
    lifecycle.remove.mutate(plan.id, {
      onSuccess: () => toast.success(`"${plan.name}" deleted.`),
      onError: (err) => toast.error(errorMessage(err, "Could not delete the plan")),
      onSettled: () => setDeleting(null),
    });
  };

  const [modal, setModal] = useState<{ open: boolean; editing: Plan | null }>({ open: false, editing: null });
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => { setFormError(null); setModal({ open: true, editing: null }); };
  const openEdit = (plan: Plan) => { setFormError(null); setModal({ open: true, editing: plan }); };
  const closeModal = () => setModal({ open: false, editing: null });

  /** Pending edit waiting for the apply-to-all / new-version choice */
  const [choice, setChoice] = useState<{ plan: Plan; form: PlanForm; changedCount: number } | null>(null);

  const submitUpdate = (plan: Plan, form: PlanForm, mode?: PlanEditMode) => {
    updatePlan.mutate(
      { id: plan.id, data: toUpdatePayload(form), mode },
      {
        onSuccess: (result: PlanUpdateResult) => {
          const subs = plan.liveSubscribers ?? 0;
          const text =
            mode === "new_version"
              ? `"${form.name}" published as v${result.plan.version}. ${subs} subscriber${subs === 1 ? "" : "s"} stay on v${plan.version}.`
              : result.subscribersAffected > 0
                ? `"${form.name}" saved and applied to ${result.subscribersAffected} subscriber${result.subscribersAffected === 1 ? "" : "s"}.`
                : `Plan "${form.name}" saved.`;
          toast.success(text);
          setChoice(null);
          closeModal();
        },
        onError: (err) => {
          setChoice(null);
          setFormError(errorMessage(err, "Could not save the plan"));
        },
      },
    );
  };

  const handleSave = (form: PlanForm) => {
    setFormError(null);
    const editing = modal.editing;
    if (!editing) {
      createPlan.mutate(toCreatePayload(form), {
        onSuccess: () => {
          toast.success(`Plan "${form.name}" saved.`);
          closeModal();
        },
        onError: (err) => setFormError(errorMessage(err, "Could not save the plan")),
      });
      return;
    }
    const changed = subscriberAffectingChanges(planToForm(editing), form);
    if ((editing.liveSubscribers ?? 0) > 0 && changed.length > 0) {
      setChoice({ plan: editing, form, changedCount: changed.length });
      return;
    }
    submitUpdate(editing, form);
  };

  /** Plan waiting for the deactivate confirmation (activating needs none) */
  const [deactivating, setDeactivating] = useState<Plan | null>(null);

  const applyToggle = (plan: Plan) => {
    updatePlan.mutate(
      { id: plan.id, data: { isActive: !plan.isActive } },
      {
        onSuccess: () => {
          setDeactivating(null);
          toast.success(`"${plan.name}" ${plan.isActive ? "deactivated" : "activated"}.`);
        },
        onError: (err) => {
          setDeactivating(null);
          toast.error(errorMessage(err, "Could not update the plan"));
        },
      },
    );
  };

  const handleToggle = (plan: Plan) => {
    if (plan.isActive) {
      setDeactivating(plan);
      return;
    }
    applyToggle(plan);
  };

  const isSaving = createPlan.isPending || updatePlan.isPending;

  const columns: DataTableColumn<Plan>[] = [
    {
      id: "plan",
      header: "Plan",
      cell: (plan) => (
        <>
          <div className="font-medium text-on-surface">{plan.name}</div>
          <div className="text-label text-on-surface-variant">{plan.slug} · v{plan.version}</div>
        </>
      ),
    },
    {
      id: "cycle",
      header: "Cycle",
      skeleton: "short",
      cellClassName: "text-on-surface-variant",
      cell: (plan) => (plan.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"),
    },
    {
      id: "price",
      header: "Price",
      skeleton: "short",
      cellClassName: "font-medium text-on-surface",
      cell: (plan) => formatMoney(plan.priceInCents, plan.currency),
    },
    {
      id: "subscribers",
      header: "Subscribers",
      skeleton: "short",
      cellClassName: "text-on-surface-variant",
      cell: (plan) => (plan.liveSubscribers ?? 0).toLocaleString(),
    },
    { id: "users", header: "Users", skeleton: "short", cellClassName: "text-on-surface-variant", cell: (plan) => formatLimit(plan.maxUsers) },
    {
      id: "sessions",
      header: "Sessions",
      skeleton: "short",
      cellClassName: "text-on-surface-variant",
      cell: (plan) => formatLimit(plan.maxWhatsappSessions),
    },
    {
      id: "messages",
      header: "Messages",
      skeleton: "short",
      cellClassName: "text-on-surface-variant",
      cell: (plan) => formatLimit(plan.maxMessagesPerMonth),
    },
    {
      id: "features",
      header: "Features",
      skeleton: "badge",
      cell: (plan) => (
        <div className="flex flex-wrap gap-1">
          {plan.campaignsEnabled && <Badge variant="muted" className="text-label">Campaigns</Badge>}
          {plan.automationEnabled && <Badge variant="muted" className="text-label">Auto</Badge>}
          {plan.apiEnabled && <Badge variant="muted" className="text-label">API</Badge>}
          {plan.aiEnabled && <Badge variant="muted" className="text-label">AI</Badge>}
          {plan.shopifyEnabled && <Badge variant="muted" className="text-label">Shopify</Badge>}
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (plan) => (
        <>
          {plan.archivedAt ? (
            <Badge variant="muted" className="text-label">Archived</Badge>
          ) : plan.isActive ? (
            <Badge className="text-label bg-success-container text-success border-success/30">Active</Badge>
          ) : (plan.liveSubscribers ?? 0) > 0 ? (
            <Badge variant="warning" className="text-label">Retired · grandfathered</Badge>
          ) : (
            <Badge variant="muted" className="text-label">Inactive</Badge>
          )}
          {plan.isDefault && (
            <Badge className="text-label ml-1 bg-primary/10 text-primary-container border-primary/30">Default</Badge>
          )}
        </>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      skeleton: "none",
      cell: (plan) => (
        <div className="flex items-center gap-2">
          <IconButton
            size="sm"
            onClick={() => openEdit(plan)}
            className="hover:text-primary-container hover:bg-primary/10"
            aria-label={`Edit ${plan.name}`}
            title="Edit"
          >
            <Pencil className="w-4 h-4" aria-hidden />
          </IconButton>
          {plan.archivedAt ? (
            <IconButton
              size="sm"
              onClick={() => handleUnarchive(plan)}
              disabled={lifecycleBusy}
              className="hover:text-primary-container hover:bg-primary/10"
              aria-label={`Unarchive ${plan.name}`}
              title="Unarchive"
            >
              <ArchiveRestore className="w-4 h-4" aria-hidden />
            </IconButton>
          ) : (
            <>
              <IconButton
                size="sm"
                role="switch"
                aria-checked={plan.isActive}
                aria-label={`${plan.name} active`}
                title={plan.isActive ? "Deactivate" : "Activate"}
                disabled={updatePlan.isPending}
                onClick={() => handleToggle(plan)}
              >
                {plan.isActive ? (
                  <ToggleRight className="w-4 h-4 text-success" aria-hidden />
                ) : (
                  <ToggleLeft className="w-4 h-4" aria-hidden />
                )}
              </IconButton>
              <IconButton
                size="sm"
                onClick={() => setArchiving(plan)}
                disabled={lifecycleBusy}
                aria-label={`Archive ${plan.name}`}
                title="Archive"
              >
                <Archive className="w-4 h-4" aria-hidden />
              </IconButton>
            </>
          )}
          {(plan.liveSubscribers ?? 0) === 0 && (
            <IconButton
              size="sm"
              onClick={() => setDeleting(plan)}
              disabled={lifecycleBusy}
              className="hover:text-error hover:bg-error/10"
              aria-label={`Delete ${plan.name}`}
              title="Delete"
            >
              <Trash2 className="w-4 h-4" aria-hidden />
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-5">
      <PageHeader
        title="Plans"
        count={plans.length}
        actions={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" aria-hidden />
            New plan
          </Button>
        }
      />

      <FilterBar>
        {[
          { label: "Show inactive", count: inactiveCount, on: showInactive, set: setShowInactive },
          { label: "Show archived", count: archivedCount, on: showArchived, set: setShowArchived },
        ].map((chip) => (
          <button
            key={chip.label}
            type="button"
            aria-pressed={chip.on}
            onClick={() => chip.set(!chip.on)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-label transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
              chip.on
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
            )}
          >
            {chip.on && <Check className="h-3.5 w-3.5" aria-hidden />}
            {chip.label}
            <span className="tabular-nums opacity-70">{chip.count}</span>
          </button>
        ))}
      </FilterBar>

      <div className={TABLE_CARD}>
        <DataTable
          label="Subscription plans"
          columns={columns}
          rows={plans}
          rowKey={(plan) => plan.id}
          rowLabel={(plan) => plan.name}
          loading={isLoading}
          skeletonRows={5}
          error={isError}
          onRetry={() => refetch()}
          empty={{
            icon: <Package className="w-10 h-10" aria-hidden />,
            title: allPlans.length ? "No active plans" : "No plans yet",
            description: allPlans.length ? "Show inactive plans to reactivate one." : "Create your first plan.",
          }}
        />
      </div>

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

      <Modal
        open={!!choice}
        onClose={() => setChoice(null)}
        dismissible={!updatePlan.isPending}
        aria-labelledby="plan-choice-title"
        className="max-w-lg"
      >
        {() =>
          choice && (
            <PlanEditChoiceBody
              plan={choice.plan}
              changedCount={choice.changedCount}
              loading={updatePlan.isPending}
              onCancel={() => setChoice(null)}
              onConfirm={(mode) => submitUpdate(choice.plan, choice.form, mode)}
            />
          )
        }
      </Modal>

      <ConfirmDialog
        open={!!deactivating}
        title={`Deactivate "${deactivating?.name ?? ""}"?`}
        message="New sign-ups won't be able to choose this plan. Existing subscribers keep it."
        confirmLabel="Deactivate"
        variant="warning"
        loading={updatePlan.isPending}
        onConfirm={() => deactivating && applyToggle(deactivating)}
        onCancel={() => setDeactivating(null)}
      />

      <ConfirmDialog
        open={!!archiving}
        title={`Archive "${archiving?.name ?? ""}"?`}
        message={
          (archiving?.liveSubscribers ?? 0) > 0
            ? `It comes off sale and is hidden from this list. Its ${archiving?.liveSubscribers} existing subscriber${archiving?.liveSubscribers === 1 ? "" : "s"} keep the plan and keep renewing on it.`
            : "It comes off sale and is hidden from this list. Any existing subscribers keep the plan. You can unarchive it later."
        }
        confirmLabel="Archive"
        variant="warning"
        loading={lifecycle.archive.isPending}
        onConfirm={() => archiving && confirmArchive(archiving)}
        onCancel={() => setArchiving(null)}
      />

      <ConfirmDialog
        open={!!deleting}
        title={`Delete "${deleting?.name ?? ""}"?`}
        message="This permanently removes the plan. Only plans that never had a subscription can be deleted; plans with history must be archived."
        confirmLabel="Delete plan"
        variant="danger"
        loading={lifecycle.remove.isPending}
        onConfirm={() => deleting && confirmDelete(deleting)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
