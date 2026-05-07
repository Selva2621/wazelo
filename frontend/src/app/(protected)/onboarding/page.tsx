"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronRight, Users, MessageSquare, Zap, Bot, Code2,
  Sparkles, CreditCard, Clock, ArrowRight,
} from "lucide-react";
import { usePlans, useSubscribeToPlan, useCreateOrder, useVerifyPayment, useSubscription } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { Spinner } from "@/components/ui/spinner";
import type { Plan, BillingCycle } from "@/lib/types/billing";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(cents: number) {
  return `₹${(cents / 100).toLocaleString("en-IN")}`;
}

function formatLimit(val: number) {
  if (val === 0) return "Unlimited";
  if (val >= 100000) return `${(val / 100000).toFixed(0)}L`;
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return `${val}`;
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
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
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
              className={`text-sm font-medium hidden sm:block ${
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
  onContinue,
}: {
  firstName: string;
  daysLeft: number;
  onContinue: () => void;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-success" />
      </div>
      <h1 className="text-2xl font-bold text-on-surface mb-2">
        Your free trial is active{firstName ? `, ${firstName}` : ""}!
      </h1>
      <p className="text-on-surface-variant mb-6 max-w-md mx-auto">
        You have <strong className="text-on-surface">{daysLeft} days</strong> to explore all features — no card required.
        Start by connecting your WhatsApp number.
      </p>

      <div className="bg-surface-container rounded-xl p-4 mb-6 max-w-sm mx-auto space-y-2 text-left">
        {[
          { icon: Users, label: "Agents included", value: "3 users" },
          { icon: MessageSquare, label: "Messages/month", value: "1,000" },
          { icon: Zap, label: "Campaigns/month", value: "5" },
          { icon: Bot, label: "Automation", value: "Included" },
          { icon: Clock, label: "Trial duration", value: `${daysLeft} days remaining` },
        ].map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-on-surface-variant">
              <Icon className="w-4 h-4" />
              {label}
            </span>
            <span className="font-medium text-on-surface">{value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="bg-primary text-on-primary font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
      >
        Go to Dashboard
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Step 0: Welcome ─────────────────────────────────────────────────────────

function WelcomeStep({ orgName, onNext }: { orgName: string; onNext: () => void }) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Sparkles className="w-8 h-8 text-primary" />
      </div>
      <h1 className="text-2xl font-bold text-on-surface mb-2">
        Welcome to Wazelo CRM{orgName ? `, ${orgName}` : ""}!
      </h1>
      <p className="text-on-surface-variant mb-8 max-w-md mx-auto">
        Your free trial has expired. Choose a paid plan to continue using all features.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left max-w-lg mx-auto">
        {[
          { icon: MessageSquare, title: "Shared Inbox", desc: "Your whole team in one WhatsApp inbox" },
          { icon: Zap, title: "Campaigns", desc: "Broadcast messages to thousands at once" },
          { icon: Bot, title: "Automation", desc: "Auto-reply and workflow rules" },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-surface-container rounded-xl p-4">
            <Icon className="w-5 h-5 text-primary mb-2" />
            <div className="font-semibold text-sm text-on-surface">{title}</div>
            <div className="text-xs text-on-surface-variant mt-0.5">{desc}</div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="bg-primary text-on-primary font-semibold px-8 py-3 rounded-xl hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
      >
        Choose a Plan
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
}

// ─── Plan Card ────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  selected,
  yearly,
  onSelect,
}: {
  plan: Plan;
  selected: boolean;
  yearly: boolean;
  onSelect: () => void;
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
          <div className="font-semibold text-on-surface">{plan.name}</div>
          <div className="text-xs text-on-surface-variant mt-0.5">{plan.description}</div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="font-bold text-on-surface">
            {formatINR(perMonth)}<span className="text-xs font-normal text-on-surface-variant">/mo</span>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{formatLimit(plan.maxUsers)} agents</span>
        <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{formatLimit(plan.maxMessagesPerMonth)} msgs/mo</span>
        {plan.automationEnabled && <span className="flex items-center gap-1"><Bot className="w-3 h-3" />Automation</span>}
        {(plan as any).apiEnabled && <span className="flex items-center gap-1"><Code2 className="w-3 h-3" />API</span>}
      </div>
      {selected && (
        <div className="mt-2 flex items-center gap-1 text-xs text-primary font-medium">
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
}: {
  plans: Plan[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  yearly: boolean;
  onYearlyToggle: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const cycle: BillingCycle = yearly ? "YEARLY" : "MONTHLY";
  // Filter out free-trial plan — it's only auto-assigned on signup
  const filtered = plans
    .filter((p) => p.billingCycle === cycle && p.isActive && p.slug !== "free-trial")
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-on-surface">Choose your plan</h2>
        <p className="text-sm text-on-surface-variant mt-1">
          All plans include full access — cancel anytime
        </p>
      </div>

      {/* Cycle toggle */}
      <div className="flex items-center justify-center gap-3 mb-6">
        <span className={`text-sm font-medium ${!yearly ? "text-on-surface" : "text-on-surface-variant"}`}>Monthly</span>
        <button
          onClick={onYearlyToggle}
          className={`relative w-11 h-6 rounded-full transition-colors ${yearly ? "bg-primary" : "bg-surface-container-high"}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-on-primary shadow transition-transform ${yearly ? "translate-x-5" : "translate-x-0"}`} />
        </button>
        <span className={`text-sm font-medium ${yearly ? "text-on-surface" : "text-on-surface-variant"}`}>
          Yearly
          <span className="ml-1.5 bg-success/10 text-success text-xs font-semibold px-1.5 py-0.5 rounded-full">Save 17%</span>
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
          />
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!selectedId}
          className="flex-1 bg-primary text-on-primary font-semibold py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors inline-flex items-center justify-center gap-2"
        >
          Continue
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Step 2: Confirm ─────────────────────────────────────────────────────────

function ConfirmStep({
  plan,
  onConfirm,
  onBack,
  loading,
  error,
}: {
  plan: Plan;
  onConfirm: () => void;
  onBack: () => void;
  loading: boolean;
  error: string | null;
}) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CreditCard className="w-8 h-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold text-on-surface mb-2">
        Subscribe to {plan.name}
      </h2>
      <p className="text-on-surface-variant mb-6">
        Complete payment to activate your <strong>{plan.name}</strong> plan instantly.
      </p>

      <div className="bg-surface-container rounded-xl p-4 text-left mb-6 max-w-sm mx-auto space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Plan</span>
          <span className="font-medium text-on-surface">{plan.name}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Agents</span>
          <span className="font-medium text-on-surface">{formatLimit(plan.maxUsers)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-on-surface-variant">Messages/mo</span>
          <span className="font-medium text-on-surface">{formatLimit(plan.maxMessagesPerMonth)}</span>
        </div>
        <div className="flex justify-between text-sm border-t border-outline-variant pt-2 mt-2">
          <span className="text-on-surface-variant">Due today</span>
          <span className="font-bold text-on-surface">{formatINR(plan.priceInCents)}</span>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-error/10 border border-error/30 px-4 py-3 text-sm text-error text-left max-w-sm mx-auto">
          {error}
        </div>
      )}

      <div className="flex gap-3 max-w-sm mx-auto">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors"
        >
          Back
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="flex-1 bg-primary text-on-primary font-semibold py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Spinner className="w-4 h-4" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4" />
              Pay {formatINR(plan.priceInCents)}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: subData, isLoading: subLoading } = useSubscription();
  const { data: plans, isLoading: plansLoading } = usePlans();
  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();

  const [step, setStep] = useState(0);
  const [yearly, setYearly] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan = plans?.find((p) => p.id === selectedPlanId) ?? null;
  const isLoading = createOrder.isPending || verifyPayment.isPending;

  const isOnTrial = subData?.subscription?.status === "TRIAL";
  const trialDaysLeft = daysRemaining(subData?.subscription?.trialEndsAt);

  // If on active trial → show trial welcome screen
  if (!subLoading && isOnTrial) {
    return (
      <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12">
        <div className="w-full max-w-xl">
          <div className="text-center mb-8">
            <span className="font-bold text-on-surface text-xl">CRM-<span className="text-primary">WA</span></span>
          </div>
          <div className="bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant p-8">
            <TrialActiveStep
              firstName={user?.firstName ?? ""}
              daysLeft={trialDaysLeft}
              onContinue={() => router.push("/inbox")}
            />
          </div>
        </div>
      </div>
    );
  }

  const handleConfirm = async () => {
    if (!selectedPlanId || !selectedPlan) return;
    setError(null);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setError("Failed to load payment gateway. Please check your connection and try again.");
      return;
    }

    createOrder.mutate(selectedPlanId, {
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
                onSuccess: () => router.push("/inbox"),
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
          theme: { color: "#6366F1" },
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
    <div className="min-h-screen bg-surface flex items-start justify-center pt-12 px-4 pb-12">
      <div className="w-full max-w-xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="font-bold text-on-surface text-xl">CRM-<span className="text-primary">WA</span></span>
        </div>

        <Steps current={step} labels={["Welcome", "Choose Plan", "Confirm"]} />

        <div className="bg-surface-container-low rounded-2xl shadow-xl border border-outline-variant p-8">
          {(subLoading || plansLoading) ? (
            <div className="flex items-center justify-center h-40">
              <Spinner />
            </div>
          ) : step === 0 ? (
            <WelcomeStep
              orgName={user?.firstName ?? ""}
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

        <p className="text-center text-xs text-on-surface-variant mt-4">
          Already have an account?{" "}
          <a href="/auth/login" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
