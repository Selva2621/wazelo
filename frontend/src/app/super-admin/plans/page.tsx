"use client";

import { useState } from "react";
import {
  Package,
  Plus,
  Pencil,
  ToggleLeft,
  ToggleRight,
  X,
  Check,
} from "lucide-react";
import { useSAPlans, useSACreatePlan, useSAUpdatePlan } from "@/hooks/use-super-admin";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import type { Plan, BillingCycle } from "@/lib/types/billing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

function formatLimit(val: number, unit = "") {
  if (val === 0) return "Unlimited";
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k${unit}`;
  return `${val}${unit}`;
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
  isActive: true,
  isDefault: false,
};

type PlanForm = typeof EMPTY_FORM;

// ─── Plan Form Modal ──────────────────────────────────────────────────────────

function PlanModal({
  initial,
  onClose,
  onSave,
  loading,
}: {
  initial: PlanForm;
  onClose: () => void;
  onSave: (data: PlanForm) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState<PlanForm>(initial);
  const set = (field: keyof PlanForm, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const intField = (field: keyof PlanForm) => ({
    type: "number" as const,
    value: form[field] as number,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      set(field, parseInt(e.target.value) || 0),
    className:
      "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial.slug ? "Edit Plan" : "Create Plan"}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Plan Name</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Starter"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Slug</label>
            <input
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.slug}
              onChange={(e) => set("slug", e.target.value)}
              placeholder="starter-monthly"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Billing Cycle</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              value={form.billingCycle}
              onChange={(e) => set("billingCycle", e.target.value as BillingCycle)}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Price (paise)</label>
            <input {...intField("priceInCents")} placeholder="49900" />
            <p className="text-xs text-gray-400 mt-0.5">
              {formatINR(form.priceInCents)} / {form.billingCycle === "MONTHLY" ? "mo" : "yr"}
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max Users</label>
            <input {...intField("maxUsers")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Max WA Sessions</label>
            <input {...intField("maxWhatsappSessions")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Messages/mo <span className="text-gray-400">(0 = unlimited)</span>
            </label>
            <input {...intField("maxMessagesPerMonth")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Campaigns/mo <span className="text-gray-400">(0 = unlimited)</span>
            </label>
            <input {...intField("maxCampaignsPerMonth")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max API Calls/mo <span className="text-gray-400">(0 = unlimited)</span>
            </label>
            <input {...intField("maxApiCallsPerMonth")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              AI Credits/mo <span className="text-gray-400">(0 = unlimited)</span>
            </label>
            <input {...intField("aiCreditsPerMonth")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Templates <span className="text-gray-400">(0 = unlimited)</span>
            </label>
            <input {...intField("maxMessageTemplates")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Max Shopify Stores <span className="text-gray-400">(0 = unlimited)</span>
            </label>
            <input {...intField("maxShopifyStores")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Trial Days</label>
            <input {...intField("trialDays")} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sort Order</label>
            <input {...intField("sortOrder")} />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-wrap gap-4">
            {(
              [
                ["campaignsEnabled", "Campaigns"],
                ["automationEnabled", "Automation"],
                ["apiEnabled", "API Access"],
                ["aiEnabled", "AI Features"],
                ["shopifyEnabled", "Shopify Integration"],
                ["isActive", "Active"],
                ["isDefault", "Default"],
              ] as [keyof PlanForm, string][]
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form[key] as boolean}
                  onChange={(e) => set(key, e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={() => onSave(form)} disabled={loading}>
            {loading ? <Spinner className="w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />}
            Save Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SuperAdminPlansPage() {
  const { data, isLoading } = useSAPlans();
  const createPlan = useSACreatePlan();
  const updatePlan = useSAUpdatePlan();

  const plans: Plan[] = data?.plans ?? [];

  const [modal, setModal] = useState<{ open: boolean; editing: Plan | null }>({
    open: false,
    editing: null,
  });

  const openCreate = () => setModal({ open: true, editing: null });
  const openEdit = (plan: Plan) => setModal({ open: true, editing: plan });
  const closeModal = () => setModal({ open: false, editing: null });

  const handleSave = (form: PlanForm) => {
    if (modal.editing) {
      updatePlan.mutate(
        { id: modal.editing.id, data: form as unknown as Record<string, unknown> },
        { onSuccess: closeModal },
      );
    } else {
      createPlan.mutate(form as unknown as Record<string, unknown>, { onSuccess: closeModal });
    }
  };

  const handleToggle = (plan: Plan) => {
    updatePlan.mutate({ id: plan.id, data: { isActive: !plan.isActive } });
  };

  const isSaving = createPlan.isPending || updatePlan.isPending;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
            <Package className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Plan Management</h1>
            <p className="text-sm text-gray-500">Create and manage subscription plans</p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-2" />
          New Plan
        </Button>
      </div>

      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner />
          </div>
        ) : !plans.length ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <Package className="w-10 h-10 mb-2 opacity-30" />
            <p className="text-sm">No plans yet. Create your first plan.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Cycle</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sessions</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Messages</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Features</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...plans]
                  .sort((a, b) => a.sortOrder - b.sortOrder)
                  .map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{plan.name}</div>
                        <div className="text-xs text-gray-400">{plan.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {plan.billingCycle === "MONTHLY" ? "Monthly" : "Yearly"}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {formatINR(plan.priceInCents)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatLimit(plan.maxUsers)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatLimit(plan.maxWhatsappSessions)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatLimit(plan.maxMessagesPerMonth)}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {plan.campaignsEnabled && <Badge variant="muted" className="text-xs">Campaigns</Badge>}
                          {plan.automationEnabled && <Badge variant="muted" className="text-xs">Auto</Badge>}
                          {(plan as any).apiEnabled && <Badge variant="muted" className="text-xs">API</Badge>}
                          {(plan as any).aiEnabled && <Badge variant="muted" className="text-xs">AI</Badge>}
                          {(plan as any).shopifyEnabled && <Badge variant="muted" className="text-xs">Shopify</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {plan.isActive ? (
                          <Badge className="text-xs bg-green-50 text-green-700 border-green-200">Active</Badge>
                        ) : (
                          <Badge variant="muted" className="text-xs">Inactive</Badge>
                        )}
                        {plan.isDefault && (
                          <Badge className="text-xs ml-1 bg-indigo-50 text-indigo-700 border-indigo-200">Default</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEdit(plan)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggle(plan)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title={plan.isActive ? "Deactivate" : "Activate"}
                          >
                            {plan.isActive ? (
                              <ToggleRight className="w-4 h-4 text-green-500" />
                            ) : (
                              <ToggleLeft className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {modal.open && (
        <PlanModal
          initial={
            modal.editing
              ? {
                  name: modal.editing.name,
                  slug: modal.editing.slug,
                  description: modal.editing.description ?? "",
                  billingCycle: modal.editing.billingCycle,
                  priceInCents: modal.editing.priceInCents,
                  currency: modal.editing.currency,
                  trialDays: modal.editing.trialDays,
                  maxUsers: modal.editing.maxUsers,
                  maxWhatsappSessions: modal.editing.maxWhatsappSessions,
                  maxMessagesPerMonth: modal.editing.maxMessagesPerMonth,
                  maxCampaignsPerMonth: modal.editing.maxCampaignsPerMonth,
                  campaignsEnabled: modal.editing.campaignsEnabled,
                  automationEnabled: modal.editing.automationEnabled,
                  apiEnabled: (modal.editing as any).apiEnabled ?? false,
                  maxApiCallsPerMonth: (modal.editing as any).maxApiCallsPerMonth ?? 0,
                  aiCreditsPerMonth: (modal.editing as any).aiCreditsPerMonth ?? 0,
                  aiEnabled: (modal.editing as any).aiEnabled ?? false,
                  maxMessageTemplates: (modal.editing as any).maxMessageTemplates ?? 10,
                  shopifyEnabled: (modal.editing as any).shopifyEnabled ?? false,
                  maxShopifyStores: (modal.editing as any).maxShopifyStores ?? 0,
                  softLimitPercent: modal.editing.softLimitPercent,
                  gracePeriodDays: modal.editing.gracePeriodDays,
                  sortOrder: modal.editing.sortOrder,
                  isActive: modal.editing.isActive,
                  isDefault: modal.editing.isDefault,
                }
              : EMPTY_FORM
          }
          onClose={closeModal}
          onSave={handleSave}
          loading={isSaving}
        />
      )}
    </div>
  );
}
