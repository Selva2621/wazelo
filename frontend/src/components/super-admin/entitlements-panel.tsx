"use client";

import { useId, useState } from "react";
import { useSAOrgEntitlements } from "@/hooks/use-super-admin";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

const LIMIT_LABELS: Record<string, string> = {
  MESSAGES_SENT: "Messages / month",
  ACTIVE_USERS: "Users",
  WHATSAPP_SESSIONS: "WhatsApp numbers",
  CAMPAIGN_EXECUTIONS: "Campaign runs / month",
  API_CALLS: "API calls / month",
  AI_CREDITS: "AI credits / month",
  MESSAGE_TEMPLATES: "Message templates",
};

const FEATURE_LABELS: Record<string, string> = {
  campaigns: "Campaigns",
  automation: "Automation",
  api: "API access",
  ai: "AI features",
  shopify: "Shopify",
};

const inputClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const labelClass = "block text-label font-medium text-on-surface-variant mb-1";

function limitText(v: number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return v === 0 ? "Unlimited" : v.toLocaleString();
}

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

type Editing =
  | { kind: "LIMIT"; key: string; current?: any }
  | { kind: "FEATURE"; key: string; enabled: boolean; current?: any };

/**
 * Per-org overrides on top of the plan — a super admin grant that tenants
 * can't change. Every change is in the audit log.
 */
export function EntitlementsPanel({ orgId }: { orgId: string }) {
  const { query, set, remove } = useSAOrgEntitlements(orgId);
  const uid = useId();
  const fid = (n: string) => `${uid}-${n}`;

  const [editing, setEditing] = useState<Editing | null>(null);
  const [limitValue, setLimitValue] = useState("");
  const [reason, setReason] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const open = (next: Editing) => {
    setEditing(next);
    setLimitValue(next.kind === "LIMIT" && next.current?.limitValue != null ? String(next.current.limitValue) : "");
    setReason(next.current?.reason ?? "");
    setExpiresAt(next.current?.expiresAt ? next.current.expiresAt.slice(0, 16) : "");
    setFormError(null);
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError(null);
    const label = editing.kind === "LIMIT" ? LIMIT_LABELS[editing.key] : FEATURE_LABELS[editing.key];
    set.mutate(
      {
        kind: editing.kind,
        key: editing.key,
        ...(editing.kind === "LIMIT" ? { limitValue: parseInt(limitValue, 10) } : { enabled: editing.enabled }),
        reason,
        ...(expiresAt && { expiresAt: new Date(expiresAt).toISOString() }),
      },
      {
        onSuccess: () => {
          setStatus({ kind: "success", text: `${label} override saved. It applies immediately.` });
          setEditing(null);
        },
        onError: (err) => setFormError(errorMessage(err, "Could not save the override")),
      },
    );
  };

  const doRemove = (overrideId: string, label: string) => {
    setStatus(null);
    remove.mutate(overrideId, {
      onSuccess: () => setStatus({ kind: "success", text: `${label} is back to the plan value.` }),
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not remove the override") }),
    });
  };

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-10" role="status">
        <Spinner className="text-primary" />
        <span className="sr-only">Loading limits…</span>
      </div>
    );
  }
  if (query.isError || !query.data) return <p className="text-body-lg text-error">Couldn&apos;t load limits.</p>;

  const { limits, features, planName } = query.data;
  const limitValid = editing?.kind !== "LIMIT" || (/^\d+$/.test(limitValue) && parseInt(limitValue, 10) >= 0);
  const valid = reason.trim().length >= 3 && limitValid;

  const overrideNote = (o: any) =>
    o && (
      <span className={cn("block text-label", o.active ? "text-on-surface-variant" : "text-warning")}>
        {o.active ? "" : "Expired · "}
        {o.reason}
        {o.expiresAt ? ` · until ${new Date(o.expiresAt).toLocaleDateString()}` : " · permanent"}
      </span>
    );

  return (
    <div className="space-y-4">
      <p className="text-body-lg text-on-surface-variant">
        Plan: <span className="text-on-surface font-medium">{planName ?? "No live subscription"}</span>. Overrides apply
        on top of the plan right away, and the customer can&apos;t change them. Every change is recorded in the audit log.
      </p>
      {status && <Alert variant={status.kind}>{status.text}</Alert>}

      {/* Limits */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto" aria-labelledby={fid("limits")}>
        <h2 id={fid("limits")} className="px-4 pt-4 text-body-lg font-medium text-on-surface">Limits</h2>
        <table className="w-full mt-2 text-body-lg">
          <caption className="sr-only">Usage limits: plan, override and effective value</caption>
          <thead>
            <tr className="border-b border-outline-variant text-left">
              {["Limit", "Plan", "Override", "Effective", ""].map((h, i) => (
                <th key={i} scope="col" className="px-4 py-2 text-label font-medium text-on-surface-variant">
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {limits.map((l: any) => (
              <tr key={l.key}>
                <td className="px-4 py-2 text-on-surface">{LIMIT_LABELS[l.key] ?? l.key}</td>
                <td className="px-4 py-2 text-on-surface-variant tabular-nums">{limitText(l.planValue)}</td>
                <td className="px-4 py-2 tabular-nums">
                  {l.override ? <span className="text-on-surface">{limitText(l.override.limitValue)}</span> : <span className="text-on-surface-variant">—</span>}
                  {overrideNote(l.override)}
                </td>
                <td className={cn("px-4 py-2 tabular-nums font-medium", l.overridden ? "text-primary" : "text-on-surface")}>
                  {limitText(l.effective)}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Button type="button" variant="ghost" size="sm" onClick={() => open({ kind: "LIMIT", key: l.key, current: l.override })}>
                    {l.override ? "Edit" : "Override"}
                  </Button>
                  {l.override && (
                    <Button type="button" variant="ghost" size="sm" disabled={remove.isPending}
                      onClick={() => doRemove(l.override.id, LIMIT_LABELS[l.key] ?? l.key)}>
                      Remove
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Features */}
      <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-x-auto" aria-labelledby={fid("features")}>
        <h2 id={fid("features")} className="px-4 pt-4 text-body-lg font-medium text-on-surface">Features</h2>
        <table className="w-full mt-2 text-body-lg">
          <caption className="sr-only">Features: plan, override and effective state</caption>
          <thead>
            <tr className="border-b border-outline-variant text-left">
              {["Feature", "Plan", "Override", "Effective", ""].map((h, i) => (
                <th key={i} scope="col" className="px-4 py-2 text-label font-medium text-on-surface-variant">
                  {h || <span className="sr-only">Actions</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/40">
            {features.map((f: any) => (
              <tr key={f.key}>
                <td className="px-4 py-2 text-on-surface">{FEATURE_LABELS[f.key] ?? f.key}</td>
                <td className="px-4 py-2 text-on-surface-variant">{f.planValue === null ? "—" : f.planValue ? "On" : "Off"}</td>
                <td className="px-4 py-2">
                  {f.override ? <span className="text-on-surface">Forced {f.override.enabled ? "on" : "off"}</span> : <span className="text-on-surface-variant">—</span>}
                  {overrideNote(f.override)}
                </td>
                <td className={cn("px-4 py-2 font-medium", f.overridden ? "text-primary" : "text-on-surface")}>
                  {f.effective ? "On" : "Off"}
                </td>
                <td className="px-4 py-2 text-right whitespace-nowrap">
                  <Button type="button" variant="ghost" size="sm" onClick={() => open({ kind: "FEATURE", key: f.key, enabled: true, current: f.override })}>
                    Force on
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => open({ kind: "FEATURE", key: f.key, enabled: false, current: f.override })}>
                    Force off
                  </Button>
                  {f.override && (
                    <Button type="button" variant="ghost" size="sm" disabled={remove.isPending}
                      onClick={() => doRemove(f.override.id, FEATURE_LABELS[f.key] ?? f.key)}>
                      Use plan
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <Modal open={!!editing} onClose={() => !set.isPending && setEditing(null)} dismissible={!set.isPending} aria-labelledby={fid("dlg")} className="max-w-md">
        {() =>
          editing && (
            <form onSubmit={save} className="p-6 space-y-4">
              <h2 id={fid("dlg")} className="text-title-sm font-semibold text-on-surface">
                {editing.kind === "LIMIT"
                  ? `Override: ${LIMIT_LABELS[editing.key] ?? editing.key}`
                  : `Force ${FEATURE_LABELS[editing.key] ?? editing.key} ${editing.enabled ? "on" : "off"}`}
              </h2>
              {editing.kind === "LIMIT" && (
                <div>
                  <label htmlFor={fid("value")} className={labelClass}>New limit (0 = unlimited)</label>
                  <input id={fid("value")} type="number" min={0} autoFocus className={inputClass} value={limitValue} onChange={(e) => setLimitValue(e.target.value)} />
                </div>
              )}
              <div>
                <label htmlFor={fid("reason")} className={labelClass}>Reason (recorded in the audit log)</label>
                <input id={fid("reason")} autoFocus={editing.kind === "FEATURE"} className={inputClass} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Diwali campaign — approved by sales" />
              </div>
              <div>
                <label htmlFor={fid("expires")} className={labelClass}>Expires (optional — permanent if empty)</label>
                <input id={fid("expires")} type="datetime-local" className={inputClass} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
              </div>
              {formError && <Alert variant="error">{formError}</Alert>}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setEditing(null)} disabled={set.isPending}>Cancel</Button>
                <Button type="submit" loading={set.isPending} disabled={!valid || set.isPending}>Save override</Button>
              </div>
            </form>
          )
        }
      </Modal>
    </div>
  );
}
