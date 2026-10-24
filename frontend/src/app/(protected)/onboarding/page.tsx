"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronRight, Users, MessageSquare, Zap, Bot, Code2,
  Sparkles, CreditCard, Clock, ArrowRight,
} from "lucide-react";
import { usePlans, useSubscribeToPlan, useCreateOrder, useVerifyPayment, useSubscription, useValidateCoupon } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgSettings } from "@/hooks/use-settings";
import { Spinner } from "@/components/ui/spinner";
import type { Plan, BillingCycle, SubscriptionPlanSummary } from "@/lib/types/billing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/utils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatLimit(val: number) {
  if (val === 0) return "Unlimited";
  if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return `${val}`;
}

/** First server error message from an API error, if any */
function apiMessage(err: unknown): string | undefined {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message[0] : message;
}

function daysRemaining(endsAt?: string | null) {
  if (!endsAt) return 0;
  const diff = new Date(endsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

// ─── Step indicator ───────────────────────────────────────────────────────────

function Steps({ current, labels }: { current: number; labels: string[] }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {labels.map((label, i) => (
        <div key={label} className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-label font-semibold transition-colors ${
                i < current
                  ? "bg-primary text-on-primary"
                  : i === current
                  ? "bg-primary/10 text-primary border-2 border-primary"
                  : "bg-surface-container text-on-surface-variant"
              }`}
            >
              {i < current ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span
              className={`text-body-lg font-medium hidden sm:block ${
                i === current ? "text-on-surface" : "text-on-surface-variant"
              }`}
            >
              {label}
            </span>
          </div>
          {i < labels.length - 1 && (
            <div className={`w-10 h-px ${i < current ? "bg-primary/40" : "bg-outline-variant"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Trial Active Step (auto-assigned on signup) ──────────────────────────────

function TrialActiveStep({
  firstName,
  daysLeft,
  plan,
  onContinue,
}: {
  firstName: string;
  daysLeft: number;
  /** The trial plan — its real limits, not hardcoded copy */
  plan?: SubscriptionPlanSummary;
  onContinue: () => void;
}) {
  const fmt = (n: number) => n.toLocaleString("en-IN");
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-success" />
      </div>
      <h1 className="text-headline font-semibold text-on-surface mb-2">
        Your free trial is active{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
        You have <strong className="text-on-surface">{daysLeft} days</strong> to explore all features — no card required.
        Start by connecting your WhatsApp number.
      </p>

      <div className="bg-surface-container rounded-xl p-4 mb-6 max-w-sm mx-auto space-y-2 text-left">
        {[
          ...(plan
            ? [
                { icon: Users, label: "Users included", value: `${fmt(plan.maxUsers)} user${plan.maxUsers !== 1 ? "s" : ""}` },
                { icon: MessageSquare, label: "Messages/month", value: fmt(plan.maxMessagesPerMonth) },
                { icon: Zap, label: "Campaigns/month", value: plan.campaignsEnabled ? fmt(plan.maxCampaignsPerMonth) : "Not included" },
                { icon: Bot, label: "Automation", value: plan.automationEnabled ? "Included" : "Not included" },
              ]
            : []),
          { icon: Clock, label: "Trial duration", value: `${daysLeft} days remaining` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-body-lg">
            <span className="flex items-center gap-2 text-on-surface-variant">
              <Icon className="w-4 h-4" />
              {label}
            </span>
            <span className="font-medium text-on-surface">{value}</span>
          </div>
        ))}
      </div>

      <Button size="lg"
        onClick={onContinue}
        className="max-lg:h-12 max-lg:w-full"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({
  orgName,
  trialExpired,
  isFreelancer,
  onNext,
}: {
  orgName: string;
  trialExpired: boolean;
  isFreelancer: boolean;
  onNext: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-headline font-semibold text-on-surface mb-2">
        Welcome to Wazelo CRM{orgName ? `, ${orgName}` : ""}!
      </h1>
      <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
        {trialExpired
          ? "Your free trial has ended. Choose a plan to keep using all features."
          : "Choose a plan to get started."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left max-w-lg mx-auto">
        {(isFreelancer
          ? [
              { icon: MessageSquare, title: "WhatsApp Inbox", desc: "Every client chat in one place" },
              { icon: Users, title: "Client Pipeline", desc: "Track leads from first message to won" },
              { icon: Zap, title: "Follow-ups", desc: "Sequences that nudge leads for you" },
            ]
          : [
              { icon: MessageSquare, title: "Shared Inbox", desc: "Your whole team in one WhatsApp inbox" },
              { icon: Zap, title: "Campaigns", desc: "Message your contacts in one go" },
              { icon: Bot, title: "Automation", desc: "Auto-reply and workflow rules" },
            ]
        ).map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-surface-container rounded-xl p-4">
            <Icon className="w-5 h-5 text-primary mb-2" />
            <div className="font-semibold text-body-lg text-on-surface">{title}</div>
            <div className="text-label text-on-surface-variant mt-0.5">{desc}</div>
          </div>
        ))}
      </div>

      <Button size="lg"
        onClick={onNext}
        className="max-lg:h-12 max-lg:w-full"
      >
        Choose a Plan
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  yearly,
  onSelect,
  recommended,
}: {
  plan: Plan;
  selected: boolean;
  yearly: boolean;
  onSelect: () => void;
  recommended?: boolean;
}) {
  const perMonth = yearly
    ? Math.round(plan.priceInCents / 12)
    : plan.priceInCents;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all ${
        selected
          ? "border-primary bg-primary/5 shadow-md"
          : "border-outline-variant bg-surface-container hover:border-primary/40"
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-on-surface">{plan.name}</span>
            {recommended && (
              <span className="bg-primary/10 text-primary text-caption font-semibold px-1.5 py-0.5 rounded-full">
                Best for Freelancers
              </span>
            )}
          </div>
          <div className="text-label text-on-surface-variant mt-0.5">{plan.description}</div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="font-semibold text-on-surface">
            {formatMoney(perMonth, plan.currency)}<span className="text-label font-normal text-on-surface-variant">/mo</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-label text-on-surface-variant">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{formatLimit(plan.maxUsers)} agents</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatLimit(plan.maxMessagesPerMonth)} msgs/mo</span>
        {plan.automationEnabled && <span className="flex items-center gap-1"><Bot className="w-3 h-3" />Automation</span>}
        {(plan as any).apiEnabled && <span className="flex items-center gap-1"><Code2 className="w-3 h-3" />API</span>}
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1 text-label text-primary font-medium">
          <Check className="w-3.5 h-3.5" /> Selected
        </div>
      )}
    </button>
  );
}

// ─── Step 1: Choose Plan ──────────────────────────────────────────────────────

function ChoosePlanStep({
  plans,
  selectedId,
  onSelect,
  yearly,
  onYearlyToggle,
  onNext,
  onBack,
  isFreelancer,
}: {
  plans: Plan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  yearly: boolean;
  onYearlyToggle: () => void;
  onNext: () => void;
  onBack: () => void;
  isFreelancer?: boolean;
}) {
  const cycle: BillingCycle = yearly ? "YEARLY" : "MONTHLY";
  // Free trial is only auto-assigned on signup. Freelancers see Solo plans,
  // everyone else the team plans — same rule as Settings › Billing.
  const filtered = plans
    .filter((p) => p.billingCycle === cycle && p.isActive && p.slug !== "free-trial")
    .filter((p) => (isFreelancer ? p.slug.startsWith("solo-") : !p.slug.startsWith("solo-")))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-title font-semibold text-on-surface">Choose your plan</h2>
        <p className="text-body-lg text-on-surface-variant mt-1">
          All plans include full access — cancel anytime
        </p>
      </div>

      {/* Cycle toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-body-lg font-medium ${!yearly ? "text-on-surface" : "text-on-surface-variant"}`}>Monthly</span>
        <button role="switch" aria-checked={yearly} aria-label="Bill yearly"
          onClick={onYearlyToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-surface-container-high"}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-on-primary shadow transition-transform ${yearly ? "translate-x-5" : "translate-x-0"}`} />
        </button>
        <span className={`text-body-lg font-medium ${yearly ? "text-on-surface" : "text-on-surface-variant"}`}>
          Yearly
          <span className="ml-1.5 bg-success/10 text-success text-label font-semibold px-1.5 py-0.5 rounded-full">Save 17%</span>
        </span>
      </div>

      <div className="space-y-3 mb-6">
        {filtered.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedId === plan.id}
            yearly={yearly}
            onSelect={() => onSelect(plan.id)}
            recommended={isFreelancer && plan.slug.startsWith("solo-")}
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-2.5 text-body-lg font-medium text-on-surface-variant hover:text-on-surface transition-colors max-lg:min-h-12 max-lg:px-3"
        >
          Back
        </button>
        <Button size="lg"
          onClick={onNext}
          disabled={!selectedId}
          className="flex-1 max-lg:h-12"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Step 2: Confirm ─────────────────────────────────────────────────────────

interface AppliedCoupon {
  code: string;
  discountInCents: number;
  finalAmountInCents: number;
  currency: string;
}

function ConfirmStep({
  plan,
  onConfirm,
  onBack,
  loading,
  error,
}: {
  plan: Plan;
  onConfirm: (coupon: AppliedCoupon | null) => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  const validate = useValidateCoupon();
  const [couponOpen, setCouponOpen] = useState(false);
  const [code, setCode] = useState("");
  const [coupon, setCoupon] = useState<AppliedCoupon | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);

  const applyCoupon = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setCouponError(null);
    validate.mutate(
      { code: trimmed, planId: plan.id },
      {
        onSuccess: (res) => {
          if (res.valid) {
            setCoupon({ code: trimmed, discountInCents: res.discountInCents, finalAmountInCents: res.finalAmountInCents, currency: res.currency });
          } else {
            setCoupon(null);
            setCouponError(res.message || "This coupon can't be used.");
          }
        },
        onError: (err) => setCouponError(apiMessage(err) ?? "Could not check the coupon."),
      },
    );
  };

  const dueToday = coupon ? formatMoney(coupon.finalAmountInCents, coupon.currency) : formatMoney(plan.priceInCents, plan.currency);

  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CreditCard className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-title font-semibold text-on-surface mb-2">
        Subscribe to {plan.name}
      </h2>
      <p className="text-on-surface-variant mb-6">
        Complete payment to activate your <strong>{plan.name}</strong> plan instantly.
      </p>

      <div className="bg-surface-container rounded-xl p-4 text-left mb-6 max-w-sm mx-auto space-y-2">
        <div className="flex justify-between text-body-lg">
          <span className="text-on-surface-variant">Plan</span>
          <span className="font-medium text-on-surface">{plan.name}</span>
        </div>
        <div className="flex justify-between text-body-lg">
          <span className="text-on-surface-variant">Agents</span>
          <span className="font-medium text-on-surface">{formatLimit(plan.maxUsers)}</span>
        </div>
        <div className="flex justify-between text-body-lg">
          <span className="text-on-surface-variant">Messages/mo</span>
          <span className="font-medium text-on-surface">{formatLimit(plan.maxMessagesPerMonth)}</span>
        </div>
        {coupon && (
          <div className="flex justify-between text-body-lg">
            <span className="text-on-surface-variant">
              Coupon <span className="font-mono">{coupon.code}</span>{" "}
              <button
                type="button"
                onClick={() => { setCoupon(null); setCode(""); }}
                disabled={loading}
                className="text-label text-primary hover:underline"
              >
                Remove
              </button>
            </span>
            <span className="font-medium text-success">−{formatMoney(coupon.discountInCents, coupon.currency)}</span>
          </div>
        )}
        <div className="flex justify-between text-body-lg border-t border-outline-variant pt-2 mt-2">
          <span className="text-on-surface-variant">Due today</span>
          <span className="font-semibold text-on-surface">{dueToday}</span>
        </div>
      </div>

      {!coupon && (
        <div className="max-w-sm mx-auto mb-6 text-left">
          {couponOpen ? (
            <form
              onSubmit={(e) => { e.preventDefault(); applyCoupon(); }}
              className="flex gap-2 items-start"
            >
              <Input
                aria-label="Coupon code"
                autoFocus
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setCouponError(null); }}
                placeholder="Coupon code"
                className="font-mono"
                maxLength={40}
                error={couponError ?? undefined}
                disabled={loading || validate.isPending}
              />
              <Button type="submit" variant="secondary" loading={validate.isPending} disabled={loading || !code.trim()}>
                Apply
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setCouponOpen(true)}
              className="text-body-lg text-primary hover:underline"
            >
              Have a coupon?
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-error/10 border border-error/30 px-4 py-3 text-body-lg text-error text-left max-w-sm mx-auto">
          {error}
        </div>
      )}

      <div className="flex gap-3 max-w-sm mx-auto">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-5 py-2.5 text-body-lg font-medium text-on-surface-variant hover:text-on-surface transition-colors max-lg:min-h-12 max-lg:px-3"
        >
          Back
        </button>
        <Button size="lg"
          onClick={() => onConfirm(coupon)}
          disabled={loading || validate.isPending}
          className="flex-1 max-lg:h-12"
        >
          {loading ? (
            <>
              <Spinner className="w-4 h-4" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              {coupon?.finalAmountInCents === 0 ? "Activate plan" : `Pay ${dueToday}`}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: subData, isLoading: subLoading } = useSubscription();
  const { data: orgSettings, isLoading: orgLoading } = useOrgSettings();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();
  const subscribe = useSubscribeToPlan();

  // Redirect to type selector if org type not yet explicitly chosen.
  // orgType defaults to "CRM" in the DB — treat "CRM" as "not yet chosen".
  useEffect(() => {
    if (orgLoading) return;
    if (!orgSettings?.orgType || orgSettings.orgType === "CRM") {
      router.replace("/onboarding/type");
    }
  }, [orgLoading, orgSettings?.orgType, router]);

  const [step, setStep] = useState(0);
  const [yearly, setYearly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId) ?? null;
  const isLoading = createOrder.isPending || verifyPayment.isPending || subscribe.isPending;

  const isOnTrial = subData?.subscription?.status === "TRIAL";
  const trialDaysLeft = daysRemaining(subData?.subscription?.trialEndsAt);

  // If on active trial → show trial welcome screen
  if (!subLoading && isOnTrial) {
    return (
      <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12 max-lg:min-h-dvh max-lg:pt-[calc(24px+var(--safe-top))] max-lg:pb-[calc(24px+var(--safe-bottom))] max-lg:pl-[max(16px,var(--safe-left))] max-lg:pr-[max(16px,var(--safe-right))]">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8 max-lg:mb-5">
            <span className="font-semibold text-on-surface text-title">Waze<span className="text-primary">lo</span></span>
          </div>
          <div className="bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant p-8 max-lg:p-5">
            <TrialActiveStep
              firstName={user?.firstName ?? ""}
              daysLeft={trialDaysLeft}
              plan={subData?.subscription?.plan}
              onContinue={() => router.push("/dashboard")}
            />
          </div>
        </div>
      </div>
    );
  }

  const handleConfirm = async (coupon: AppliedCoupon | null) => {
    if (!selectedPlanId || !selectedPlan) return;
    setError(null);

    // Coupon covers the full price: no payment, subscribe directly
    if (coupon && coupon.finalAmountInCents === 0) {
      subscribe.mutate(
        { planId: selectedPlanId, couponCode: coupon.code },
        {
          onSuccess: () => router.push("/dashboard"),
          onError: (err) => setError(apiMessage(err) ?? "Could not activate the plan. Please try again."),
        },
      );
      return;
    }

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load payment gateway. Please check your connection and try again.");
      return;
    }

    createOrder.mutate({ planId: selectedPlanId, couponCode: coupon?.code }, {
      onSuccess: (order) => {
        const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
        const options = {
          key: razorpayKeyId,
          amount: order.amount,
          currency: order.currency,
          name: "Wazelo CRM",
          description: `${order.planName} Plan Subscription`,
          order_id: order.orderId,
          handler: (response: any) => {
            verifyPayment.mutate(
              {
                planId: selectedPlanId,
                orderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                idempotencyKey: `onboarding-${user?.orgId ?? ""}-${selectedPlanId}`,
              },
              {
                onSuccess: () => router.push("/dashboard"),
                onError: (err: any) => {
                  setError(err?.response?.data?.message ?? "Payment verification failed. Contact support.");
                },
              },
            );
          },
          prefill: {
            name: user ? `${user.firstName} ${user.lastName}` : "",
            email: user?.email ?? "",
          },
          theme: { color: "#d97706" },
          modal: {
            ondismiss: () => {
              setError("Payment was cancelled. Please try again.");
            },
          },
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      },
      onError: (err: any) => {
        setError(err?.response?.data?.message ?? "Failed to create payment order. Please try again.");
      },
    });
  };

  return (
    <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12 max-lg:min-h-dvh max-lg:pt-[calc(24px+var(--safe-top))] max-lg:pb-[calc(24px+var(--safe-bottom))] max-lg:pl-[max(16px,var(--safe-left))] max-lg:pr-[max(16px,var(--safe-right))]">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8 max-lg:mb-5">
          <span className="font-semibold text-on-surface text-title">Waze<span className="text-primary">lo</span></span>
        </div>

        <Steps current={step} labels={["Welcome", "Choose Plan", "Confirm"]} />

        <div className="bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant p-8 max-lg:p-5">
          {(subLoading || plansLoading) ? (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          ) : step === 0 ? (
            <WelcomeStep
              orgName={user?.firstName ?? ""}
              trialExpired={subData?.subscription?.status === "EXPIRED"}
              isFreelancer={orgSettings?.orgType === "FREELANCER"}
              onNext={() => setStep(1)}
            />
          ) : step === 1 ? (
            <ChoosePlanStep
              plans={plans ?? []}
              selectedId={selectedPlanId}
              onSelect={(id) => {
                setSelectedPlanId(id);
                setError(null);
              }}
              yearly={yearly}
              onYearlyToggle={() => {
                setYearly((v) => !v);
                setSelectedPlanId(null);
                setError(null);
              }}
              onNext={() => selectedPlanId && setStep(2)}
              onBack={() => setStep(0)}
              isFreelancer={orgSettings?.orgType === "FREELANCER"}
            />
          ) : selectedPlan ? (
            <ConfirmStep
              plan={selectedPlan}
              onConfirm={handleConfirm}
              onBack={() => { setStep(1); setError(null); }}
              loading={isLoading}
              error={error}
            />
          ) : null}
        </div>

        <p className="text-center text-label text-on-surface-variant mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
