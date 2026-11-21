"use client";

import { useState } from "react";
import { ArrowDownCircle, ArrowRight, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useCancelSubscription, usePayments, useReactivateSubscription } from "@/hooks/use-billing";
import { useAiCredits } from "@/hooks/use-ai-credits";
import type { Subscription, UsageMetrics } from "@/lib/types/billing";
import { cn, formatMoney } from "@/lib/utils";
import {
  billingCard,
  cycleSuffix,
  formatBillingDate,
  PaymentStatusBadge,
  SubscriptionStatusBadge,
} from "./billing-format";
import { UsageMeter } from "./usage-meter";
import type { BillingTab } from "./billing-workspace";

const REACTIVATABLE = ["CANCELLED", "EXPIRED", "GRACE_PERIOD", "PAST_DUE"];

interface BillingOverviewProps {
  subscription: Subscription | null;
  usage: UsageMetrics | null;
  onGoTo: (tab: BillingTab) => void;
}

export function BillingOverview({ subscription, usage, onGoTo }: BillingOverviewProps) {
  return (
    <div className="space-y-4">
      {subscription ? (
        <PlanSummary subscription={subscription} onGoTo={onGoTo} />
      ) : (
        <section aria-labelledby="no-plan-heading" className={cn(billingCard, "p-6")}>
          <h2 id="no-plan-heading" className="text-title-sm font-semibold text-on-surface">
            No active plan
          </h2>
          <p className="mt-1 text-body text-on-surface-variant">Pick a plan to start sending.</p>
          <Button className="mt-4" size="sm" onClick={() => onGoTo("plans")}>
            See plans
          </Button>
        </section>
      )}

      {usage && <UsageCard usage={usage} trial={subscription?.status === "TRIAL"} />}

      <div className="grid gap-4 lg:grid-cols-2">
        <AiCreditsSummary onGoTo={onGoTo} />
        <RecentPayments onGoTo={onGoTo} />
      </div>
    </div>
  );
}

function PlanSummary({ subscription, onGoTo }: { subscription: Subscription; onGoTo: (tab: BillingTab) => void }) {
  const cancel = useCancelSubscription();
  const reactivate = useReactivateSubscription();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const { plan, status } = subscription;
  const isTrial = status === "TRIAL";

  return (
    <section aria-labelledby="plan-heading" className={cn(billingCard, "p-6")}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id="plan-heading" className="text-title font-semibold text-on-surface">
              {plan.name}
            </h2>
            <SubscriptionStatusBadge status={status} />
          </div>
          <p className="text-display font-semibold tabular-nums text-on-surface">
            {formatMoney(plan.priceInCents, plan.currency)}
            <span className="text-body-lg font-normal text-on-surface-variant">{cycleSuffix(plan.billingCycle)}</span>
          </p>
          <dl className="flex flex-wrap gap-x-6 gap-y-1 pt-1 text-body">
            <div className="flex gap-1.5">
              <dt className="text-on-surface-variant">Period</dt>
              <dd className="text-on-surface">
                {formatBillingDate(subscription.currentPeriodStart)} – {formatBillingDate(subscription.currentPeriodEnd)}
              </dd>
            </div>
            {isTrial && subscription.trialEndsAt && (
              <div className="flex items-center gap-1.5 text-warning">
                <Clock className="h-3.5 w-3.5" aria-hidden />
                <dt>Trial ends</dt>
                <dd>{formatBillingDate(subscription.trialEndsAt)}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2 max-lg:w-full max-lg:[&>*]:flex-1">
          {REACTIVATABLE.includes(status) && (
            <Button size="sm" onClick={() => reactivate.mutate()} loading={reactivate.isPending}>
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Reactivate
            </Button>
          )}
          {status === "ACTIVE" && (
            <Button variant="ghost" size="sm" className="text-error hover:text-error" onClick={() => setConfirmCancel(true)}>
              Cancel plan
            </Button>
          )}
          {(isTrial || status === "ACTIVE") && (
            <Button size="sm" variant={isTrial ? "primary" : "secondary"} onClick={() => onGoTo("plans")}>
              {isTrial ? "Upgrade" : "Change plan"}
            </Button>
          )}
        </div>
      </div>

      {subscription.scheduledPlan && subscription.scheduledChangeAt && (
        <p className="mt-4 flex items-start gap-2 border-t border-outline-variant pt-4 text-body text-on-surface-variant">
          <ArrowDownCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span>
            Switching to <span className="font-medium text-on-surface">{subscription.scheduledPlan.name}</span> (
            {formatMoney(subscription.scheduledPlan.priceInCents, subscription.scheduledPlan.currency)}
            {cycleSuffix(subscription.scheduledPlan.billingCycle)}) on {formatBillingDate(subscription.scheduledChangeAt)}
          </span>
        </p>
      )}

      <ConfirmDialog
        open={confirmCancel}
        title={`Cancel ${plan.name}?`}
        message="Your plan stays active until the end of this billing period. After that, sending stops."
        confirmLabel="Yes, cancel"
        cancelLabel="Keep plan"
        variant="danger"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate(undefined, { onSuccess: () => setConfirmCancel(false) })}
        onCancel={() => setConfirmCancel(false)}
      />
    </section>
  );
}

function UsageCard({ usage, trial }: { usage: UsageMetrics; trial: boolean }) {
  const { data: aiCredits } = useAiCredits();
  const rows = [
    { label: "Users", entry: usage.activeUsers },
    { label: "WhatsApp sessions", entry: usage.whatsappSessions },
    { label: "Messages this month", entry: usage.messagesSent },
    { label: "Campaigns this month", entry: usage.campaignExecutions },
    { label: "Templates", entry: usage.messageTemplates },
    { label: "API calls", entry: usage.apiCalls },
  ];

  return (
    <section aria-labelledby="usage-heading" className={cn(billingCard, "p-6")}>
      <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="usage-heading" className="text-title-sm font-semibold text-on-surface">
          Usage
        </h2>
        {trial && <p className="text-label text-warning">Trial limits apply</p>}
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-6 md:grid-cols-3 xl:grid-cols-4">
        {rows.map(({ label, entry }) => (
          <UsageMeter key={label} label={label} current={entry?.current ?? 0} limit={entry?.limit ?? 0} />
        ))}
        <UsageMeter
          label="AI credits"
          current={usage.aiCredits?.current ?? 0}
          limit={usage.aiCredits?.limit ?? 0}
          extra={aiCredits?.wallet.purchased ?? 0}
        />
      </div>
    </section>
  );
}

function AiCreditsSummary({ onGoTo }: { onGoTo: (tab: BillingTab) => void }) {
  const { data } = useAiCredits();
  const wallet = data?.wallet;

  return (
    <section aria-labelledby="ai-summary-heading" className={cn(billingCard, "flex flex-col p-6")}>
      <h2 id="ai-summary-heading" className="text-title-sm font-semibold text-on-surface">
        AI credits
      </h2>
      <p className="mt-3 text-headline font-semibold tabular-nums text-on-surface">
        {!wallet ? "—" : wallet.available === null ? "Unlimited" : wallet.available.toLocaleString("en-IN")}
        <span className="ml-1.5 text-body font-normal text-on-surface-variant">left</span>
      </p>
      {wallet && wallet.purchased > 0 && (
        <p className="text-label text-on-surface-variant">
          Includes {wallet.purchased.toLocaleString("en-IN")} bought credits
        </p>
      )}
      <div className="flex-1" />
      <Button variant="secondary" size="sm" className="mt-5 self-start" onClick={() => onGoTo("ai-credits")}>
        Buy credits
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
      </Button>
    </section>
  );
}

function RecentPayments({ onGoTo }: { onGoTo: (tab: BillingTab) => void }) {
  const { data, isLoading } = usePayments({ page: 1, limit: 3 });
  const payments = data?.data ?? [];

  return (
    <section aria-labelledby="recent-heading" className={cn(billingCard, "flex flex-col p-6")}>
      <h2 id="recent-heading" className="text-title-sm font-semibold text-on-surface">
        Recent payments
      </h2>
      {isLoading ? (
        <div className="mt-3 space-y-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-5 animate-pulse rounded bg-surface-container-high" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <p className="mt-3 text-body text-on-surface-variant">No payments yet.</p>
      ) : (
        <ul className="mt-2 divide-y divide-outline-variant">
          {payments.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-body">
              <span className="text-on-surface-variant">{formatBillingDate(p.createdAt)}</span>
              <span className="ml-auto tabular-nums font-medium text-on-surface">
                {formatMoney(p.amountInCents, p.currency)}
              </span>
              <PaymentStatusBadge status={p.status} />
            </li>
          ))}
        </ul>
      )}
      <div className="flex-1" />
      <Button variant="ghost" size="sm" className="mt-3 self-start" onClick={() => onGoTo("history")}>
        All payments and invoices
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" aria-hidden />
      </Button>
    </section>
  );
}
