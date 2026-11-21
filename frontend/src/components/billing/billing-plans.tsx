"use client";

import { useMemo, useState } from "react";
import { Check, Minus } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCreateOrder, usePlans, useSubscribeToPlan, useVerifyPayment } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { loadRazorpayScript, openRazorpayCheckout, RAZORPAY_THEME_COLOR, type RazorpayResponse } from "@/lib/razorpay";
import { formatPlanPrice, isTrialPlan, type BillingCycle, type Plan, type Subscription } from "@/lib/types/billing";
import { cn } from "@/lib/utils";
import { billingCard, cycleSuffix, formatLimit } from "./billing-format";

/** Statuses where a plan can be bought straight away (others reactivate first). */
const CAN_BUY = new Set(["TRIAL", "ACTIVE"]);

function errorMessage(err: unknown, fallback: string): string {
  const e = err as { response?: { data?: { message?: unknown } }; message?: string };
  const msg = e?.response?.data?.message ?? e?.message;
  return typeof msg === "string" && msg ? msg : fallback;
}

export function BillingPlans({ subscription }: { subscription: Subscription | null }) {
  const user = useAuthStore((s) => s.user);
  const { data: plans, isLoading } = usePlans();
  const subscribe = useSubscribeToPlan();
  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();
  const [cycle, setCycle] = useState<BillingCycle>(subscription?.plan.billingCycle ?? "MONTHLY");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const forOrg = useMemo(() => {
    const freelancer = user?.orgType === "FREELANCER";
    // Freelancer orgs see only Solo plans; every other org sees the rest
    return (plans ?? []).filter(
      (p) => p.isActive && !isTrialPlan(p) && p.slug.startsWith("solo-") === freelancer,
    );
  }, [plans, user?.orgType]);

  const visible = forOrg.filter((p) => p.billingCycle === cycle).sort((a, b) => a.sortOrder - b.sortOrder);

  // Best yearly saving across plans sold both ways
  const yearlySaving = useMemo(() => {
    let best = 0;
    for (const yearly of forOrg.filter((p) => p.billingCycle === "YEARLY")) {
      const monthly = forOrg.find((p) => p.billingCycle === "MONTHLY" && p.name === yearly.name);
      if (monthly && monthly.priceInCents > 0) {
        best = Math.max(best, Math.round((1 - yearly.priceInCents / (monthly.priceInCents * 12)) * 100));
      }
    }
    return best;
  }, [forOrg]);

  const busy = subscribe.isPending || createOrder.isPending || verifyPayment.isPending;
  const canBuy = !subscription || CAN_BUY.has(subscription.status);
  const currentPrice = subscription?.plan.priceInCents ?? 0;

  const pay = async (plan: Plan) => {
    setError(null);
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      setError("Payments aren't set up yet. Contact support.");
      return;
    }
    setPendingId(plan.id);
    if (!(await loadRazorpayScript())) {
      setError("Couldn't load the payment gateway. Check your connection.");
      setPendingId(null);
      return;
    }
    createOrder.mutate(plan.id, {
      onSuccess: (order) => {
        openRazorpayCheckout({
          key,
          amount: order.amount,
          currency: order.currency,
          name: "Wazelo CRM",
          description: `Subscribe to ${order.planName}`,
          order_id: order.orderId,
          prefill: { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email ?? "" },
          theme: { color: RAZORPAY_THEME_COLOR },
          handler: (res: RazorpayResponse) => {
            verifyPayment.mutate(
              {
                planId: plan.id,
                orderId: res.razorpay_order_id,
                razorpayPaymentId: res.razorpay_payment_id,
                signature: res.razorpay_signature,
                idempotencyKey: `billing-${user?.orgId ?? ""}-${plan.id}-${Date.now()}`,
              },
              {
                onError: (err) => setError(errorMessage(err, "Payment received but not confirmed yet. Refresh in a minute.")),
                onSettled: () => setPendingId(null),
              },
            );
          },
          modal: { ondismiss: () => setPendingId(null) },
        });
      },
      onError: (err) => {
        setError(errorMessage(err, "Couldn't start the payment."));
        setPendingId(null);
      },
    });
  };

  const select = (plan: Plan) => {
    if (!canBuy) return;
    if (plan.priceInCents > 0) {
      void pay(plan);
      return;
    }
    // Free plan with no subscription: subscribe directly
    if (!subscription) {
      setPendingId(plan.id);
      subscribe.mutate(plan.id, {
        onError: (err) => setError(errorMessage(err, "Couldn't start the plan.")),
        onSettled: () => setPendingId(null),
      });
    }
  };

  const actionLabel = (plan: Plan): string => {
    if (!subscription) return "Choose plan";
    if (subscription.status === "TRIAL") return "Pay and upgrade";
    return plan.priceInCents > currentPrice ? "Upgrade" : "Downgrade";
  };

  return (
    <section aria-labelledby="plans-heading" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="plans-heading" className="text-title-sm font-semibold text-on-surface">
          Plans
        </h2>
        <CycleSwitch value={cycle} onChange={setCycle} saving={yearlySaving} />
      </div>

      {error && (
        <Alert variant="error">
          {error}{" "}
          <button
            type="button"
            onClick={() => setError(null)}
            className="rounded font-medium underline hover:no-underline outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Dismiss
          </button>
        </Alert>
      )}
      {subscription && !canBuy && (
        <Alert variant="warning">Reactivate your plan from the Overview tab before changing it.</Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className={cn(billingCard, "h-96 animate-pulse")} />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <p className={cn(billingCard, "p-6 text-body text-on-surface-variant")}>
          No {cycle === "YEARLY" ? "yearly" : "monthly"} plans available.
        </p>
      ) : (
        <ul className="stagger-rows grid gap-4 grid-cols-[repeat(auto-fill,minmax(15rem,1fr))]">
          {visible.map((plan, idx) => {
            const isCurrent = subscription?.plan.id === plan.id;
            const isEnterprise = plan.name === "Enterprise";
            const popular = visible.length > 2 && idx === Math.floor(visible.length / 2) && !isCurrent;
            return (
              <li key={plan.id}>
                <PlanCard
                  plan={plan}
                  isCurrent={isCurrent}
                  popular={popular}
                  action={
                    isCurrent ? (
                      <Button className="w-full" size="sm" variant="secondary" disabled>
                        Current plan
                      </Button>
                    ) : isEnterprise ? (
                      <a
                        href="mailto:sales@wazelo.in"
                        className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-outline-variant text-body font-medium text-on-surface transition-colors hover:bg-surface-container outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      >
                        Contact sales
                      </a>
                    ) : (
                      <Button
                        className="w-full"
                        size="sm"
                        variant={popular || plan.priceInCents > currentPrice ? "primary" : "secondary"}
                        disabled={!canBuy || (busy && pendingId !== plan.id)}
                        loading={pendingId === plan.id}
                        onClick={() => select(plan)}
                        aria-label={`${actionLabel(plan)}: ${plan.name}, ${formatPlanPrice(plan)}${cycleSuffix(plan.billingCycle)}`}
                      >
                        {actionLabel(plan)}
                      </Button>
                    )
                  }
                />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function CycleSwitch({
  value,
  onChange,
  saving,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  saving: number;
}) {
  const options: { id: BillingCycle; label: string }[] = [
    { id: "MONTHLY", label: "Monthly" },
    { id: "YEARLY", label: "Yearly" },
  ];
  return (
    <div className="flex items-center gap-2">
      <div
        role="radiogroup"
        aria-label="Billing cycle"
        className="inline-flex rounded-full border border-outline-variant bg-surface-container-lowest p-0.5"
      >
        {options.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.id)}
              className={cn(
                "h-7 rounded-full px-3 text-label font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus",
                active ? "bg-on-surface text-surface" : "text-on-surface-variant hover:text-on-surface",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {saving > 0 && <span className="text-caption font-medium text-success">Save {saving}% yearly</span>}
    </div>
  );
}

function PlanCard({
  plan,
  isCurrent,
  popular,
  action,
}: {
  plan: Plan;
  isCurrent: boolean;
  popular: boolean;
  action: React.ReactNode;
}) {
  const isEnterprise = plan.name === "Enterprise";
  const limits: [string, string][] = [
    ["Users", formatLimit(plan.maxUsers)],
    ["WhatsApp sessions", formatLimit(plan.maxWhatsappSessions)],
    ["Messages / month", formatLimit(plan.maxMessagesPerMonth)],
    ["Campaigns / month", formatLimit(plan.maxCampaignsPerMonth)],
    ["Templates", formatLimit(plan.maxMessageTemplates)],
  ];
  const features: { label: string; on: boolean; detail?: string }[] = [
    { label: "Automation", on: plan.automationEnabled },
    { label: "API access", on: plan.apiEnabled, detail: plan.apiEnabled ? `${formatLimit(plan.maxApiCallsPerMonth)} calls/mo` : undefined },
    { label: "AI credits", on: plan.aiEnabled, detail: plan.aiEnabled ? `${formatLimit(plan.aiCreditsPerMonth)}/mo` : undefined },
    {
      label: "Shopify",
      on: plan.shopifyEnabled,
      detail: plan.shopifyEnabled ? `${formatLimit(plan.maxShopifyStores)} ${plan.maxShopifyStores === 1 ? "store" : "stores"}` : undefined,
    },
  ];

  return (
    <article
      aria-labelledby={`plan-${plan.id}-name`}
      className={cn(
        billingCard,
        "flex h-full flex-col p-5 transition-colors",
        isCurrent ? "border-primary ring-1 ring-primary/30" : "hover:border-outline",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 id={`plan-${plan.id}-name`} className="text-title-sm font-semibold text-on-surface">
          {plan.name}
        </h3>
        {isCurrent ? <Badge variant="primary">Current</Badge> : popular ? <Badge variant="muted">Popular</Badge> : null}
      </div>
      {plan.description && <p className="mt-1 line-clamp-2 text-label text-on-surface-variant">{plan.description}</p>}

      <p className="mt-4 tabular-nums text-on-surface">
        <span className="text-headline font-semibold">{isEnterprise ? "Custom" : formatPlanPrice(plan)}</span>
        {!isEnterprise && <span className="text-body text-on-surface-variant">{cycleSuffix(plan.billingCycle)}</span>}
      </p>

      <dl className="mt-4 space-y-2 border-t border-outline-variant pt-4">
        {limits.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-2 text-label">
            <dt className="text-on-surface-variant">{label}</dt>
            <dd className="font-medium tabular-nums text-on-surface">{value}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 space-y-2 border-t border-outline-variant pt-4" aria-label={`${plan.name} features`}>
        {features.map((f) => (
          <li key={f.label} className="flex items-center gap-2 text-label">
            {f.on ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
            ) : (
              <Minus className="h-3.5 w-3.5 shrink-0 text-on-surface-variant/50" aria-hidden />
            )}
            <span className={f.on ? "text-on-surface" : "text-on-surface-variant/70"}>
              {f.label}
              <span className="sr-only">{f.on ? ", included" : ", not included"}</span>
            </span>
            {f.detail && <span className="ml-auto tabular-nums text-on-surface-variant">{f.detail}</span>}
          </li>
        ))}
      </ul>

      <div className="mt-auto pt-5">{action}</div>
    </article>
  );
}
