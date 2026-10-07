"use client";

import { useId, useState } from "react";
import { Ban, CalendarPlus, PlayCircle, Repeat, XCircle } from "lucide-react";
import { useSAOrgActions, useSAPlans } from "@/hooks/use-super-admin";
import type { Plan } from "@/lib/types/billing";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Modal } from "@/components/ui/modal";
import { formatMoney } from "@/lib/utils";

type Dialog = "suspend" | "reactivate" | "cancel" | "change-plan" | "extend-trial" | null;

interface OrgActionsPanelProps {
  orgId: string;
  orgName: string;
  orgStatus: "ACTIVE" | "SUSPENDED";
  subscription: { status: string; planId: string } | null;
}

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

const LIVE = ["ACTIVE", "TRIAL", "PAST_DUE", "GRACE_PERIOD"];
const inputClass =
  "w-full px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

/**
 * Super admin actions for one org: suspend / reactivate, and subscription
 * cancel / change plan / extend trial. Every action is recorded in the audit log.
 */
export function OrgActionsPanel({ orgId, orgName, orgStatus, subscription }: OrgActionsPanelProps) {
  const actions = useSAOrgActions(orgId);
  const { data: plansData } = useSAPlans();
  const titleId = useId();
  const fieldId = useId();

  const [dialog, setDialog] = useState<Dialog>(null);
  const [reason, setReason] = useState("");
  const [planId, setPlanId] = useState("");
  const [days, setDays] = useState(7);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const live = subscription && LIVE.includes(subscription.status);
  const canChangePlan = subscription && (subscription.status === "ACTIVE" || subscription.status === "TRIAL");
  const activePlans: Plan[] = (plansData?.plans ?? []).filter(
    (p: Plan) => p.isActive && p.id !== subscription?.planId,
  );
  const pending = Object.values(actions).some((m) => m.isPending);

  const open = (next: Dialog) => {
    setReason("");
    setPlanId("");
    setDays(7);
    setDialogError(null);
    setDialog(next);
  };
  const close = () => !pending && setDialog(null);

  const run = (promise: Promise<unknown>, success: string) =>
    promise
      .then(() => {
        setStatus({ kind: "success", text: success });
        setDialog(null);
      })
      .catch((err) => setDialogError(errorMessage(err, "The action failed")));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);
    setStatus(null);
    switch (dialog) {
      case "suspend":
        return run(actions.suspend.mutateAsync(reason), `${orgName} is suspended. Its users were signed out.`);
      case "reactivate":
        return run(actions.reactivate.mutateAsync(), `${orgName} is active again. Users can sign in.`);
      case "cancel":
        return run(actions.cancelSubscription.mutateAsync(reason), "Subscription cancelled.");
      case "change-plan":
        return run(actions.changePlan.mutateAsync(planId), "Plan changed. New limits apply immediately.");
      case "extend-trial":
        return run(actions.extendTrial.mutateAsync(days), `Trial extended by ${days} days.`);
    }
  };

  const titles: Record<Exclude<Dialog, null>, string> = {
    suspend: `Suspend ${orgName}?`,
    reactivate: `Reactivate ${orgName}?`,
    cancel: "Cancel subscription?",
    "change-plan": "Change plan",
    "extend-trial": "Extend trial",
  };

  const reasonValid = reason.trim().length >= 3;
  const submitDisabled =
    pending ||
    ((dialog === "suspend" || dialog === "cancel") && !reasonValid) ||
    (dialog === "change-plan" && !planId) ||
    (dialog === "extend-trial" && (days < 1 || days > 90));

  return (
    <section
      aria-labelledby={`${titleId}-panel`}
      className="bg-surface-container-low border border-outline-variant rounded-xl p-5 space-y-4"
    >
      <h2 id={`${titleId}-panel`} className="text-body-lg font-medium text-on-surface">Manage</h2>

      {status && <Alert variant={status.kind}>{status.text}</Alert>}

      <div className="flex flex-wrap gap-2">
        {orgStatus === "SUSPENDED" ? (
          <Button variant="secondary" onClick={() => open("reactivate")}>
            <PlayCircle className="h-4 w-4" aria-hidden /> Reactivate organization
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => open("suspend")}>
            <Ban className="h-4 w-4" aria-hidden /> Suspend organization
          </Button>
        )}
        <Button variant="secondary" disabled={!canChangePlan} onClick={() => open("change-plan")}>
          <Repeat className="h-4 w-4" aria-hidden /> Change plan
        </Button>
        <Button variant="secondary" disabled={subscription?.status !== "TRIAL"} onClick={() => open("extend-trial")}>
          <CalendarPlus className="h-4 w-4" aria-hidden /> Extend trial
        </Button>
        <Button variant="secondary" disabled={!live} onClick={() => open("cancel")}>
          <XCircle className="h-4 w-4" aria-hidden /> Cancel subscription
        </Button>
      </div>
      <p className="text-label text-on-surface-variant">
        Billing changes update Wazelo&apos;s records only — no charge or refund is made with Razorpay or Stripe.
      </p>

      <Modal open={dialog !== null} onClose={close} dismissible={!pending} aria-labelledby={titleId} className="max-w-md">
        {() => (
          <form onSubmit={submit} className="p-6 space-y-4">
            <h2 id={titleId} className="text-title-sm font-semibold text-on-surface">
              {dialog ? titles[dialog] : ""}
            </h2>

            {dialog === "suspend" && (
              <p className="text-body text-on-surface-variant">
                All users are signed out immediately. They can&apos;t sign in, use the API, or send messages
                (campaigns, automations and chatbots stop). Incoming messages are still saved. You can reactivate any time.
              </p>
            )}
            {dialog === "reactivate" && (
              <p className="text-body text-on-surface-variant">
                Users can sign in again and messaging resumes. Messages that failed while suspended are not resent.
              </p>
            )}
            {dialog === "cancel" && (
              <p className="text-body text-on-surface-variant">
                The subscription ends now. The organization&apos;s data is kept.
              </p>
            )}

            {(dialog === "suspend" || dialog === "cancel") && (
              <div>
                <label htmlFor={fieldId} className="block text-label font-medium text-on-surface-variant mb-1">
                  Reason (recorded in the audit log)
                </label>
                <textarea
                  id={fieldId}
                  autoFocus
                  rows={3}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className={`${inputClass} resize-none`}
                />
              </div>
            )}

            {dialog === "change-plan" && (
              <div>
                <label htmlFor={fieldId} className="block text-label font-medium text-on-surface-variant mb-1">
                  New plan
                </label>
                <select id={fieldId} autoFocus value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputClass}>
                  <option value="">Choose a plan…</option>
                  {activePlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {formatMoney(p.priceInCents, p.currency)}/{p.billingCycle === "YEARLY" ? "yr" : "mo"}
                    </option>
                  ))}
                </select>
                <p className="text-label text-on-surface-variant mt-1">
                  Applies immediately at the new plan&apos;s price. Usage so far this period is kept.
                </p>
              </div>
            )}

            {dialog === "extend-trial" && (
              <div>
                <label htmlFor={fieldId} className="block text-label font-medium text-on-surface-variant mb-1">
                  Extra days (1–90)
                </label>
                <input
                  id={fieldId}
                  autoFocus
                  type="number"
                  min={1}
                  max={90}
                  value={days}
                  onChange={(e) => setDays(parseInt(e.target.value, 10) || 0)}
                  className={inputClass}
                />
              </div>
            )}

            {dialogError && <Alert variant="error">{dialogError}</Alert>}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={close} disabled={pending}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={dialog === "suspend" || dialog === "cancel" ? "destructive" : "primary"}
                loading={pending}
                disabled={submitDisabled}
              >
                {dialog === "suspend" && "Suspend"}
                {dialog === "reactivate" && "Reactivate"}
                {dialog === "cancel" && "Cancel subscription"}
                {dialog === "change-plan" && "Change plan"}
                {dialog === "extend-trial" && "Extend trial"}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  );
}
