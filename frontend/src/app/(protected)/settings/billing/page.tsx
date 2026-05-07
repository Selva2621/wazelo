"use client";

import { useState } from "react";
import {
  CreditCard,
  Check,
  ShieldAlert,
  Zap,
  Users,
  MessageSquare,
  Smartphone,
  Download,
  AlertTriangle,
  ArrowUpCircle,
  ArrowDownCircle,
  RefreshCw,
  Clock,
  FileText,
  X,
  TrendingUp,
  Code,
  Sparkles,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import {
  usePlans,
  useSubscription,
  usePayments,
  useInvoices,
  usePayment,
  useInvoice,
  useSubscribeToPlan,
  useChangePlan,
  useCancelSubscription,
  useReactivateSubscription,
  useCreateOrder,
  useVerifyPayment,
} from "@/hooks/use-billing";
import { PaymentDetailModal } from "@/components/billing/payment-detail-modal";
import { InvoiceDetailModal } from "@/components/billing/invoice-detail-modal";

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/pagination";
import type {
  Plan,
  SubscriptionPlanSummary,
  SubscriptionStatus,
  PaymentStatus,
  InvoiceStatus,
} from "@/lib/types/billing";
import { formatPlanPrice } from "@/lib/types/billing";
import { PAGE_SIZE } from "@/lib/constants";

// ─── Status Helpers ───────────────────────────

function getStatusBadge(status: SubscriptionStatus) {
  const map: Record<
    SubscriptionStatus,
    { label: string; variant: "primary" | "success" | "warning" | "error" | "default" }
  > = {
    ACTIVE: { label: "Active", variant: "success" },
    TRIAL: { label: "Trial", variant: "warning" },
    GRACE_PERIOD: { label: "Grace Period", variant: "warning" },
    PAST_DUE: { label: "Past Due", variant: "error" },
    EXPIRED: { label: "Expired", variant: "error" },
    CANCELLED: { label: "Cancelled", variant: "default" },
  };
  const m = map[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function getPaymentStatusColor(status: PaymentStatus) {
  const map: Record<PaymentStatus, string> = {
    SUCCEEDED: "text-success",
    PROCESSING: "text-warning",
    FAILED: "text-error",
    PENDING: "text-on-surface-variant",
    REFUNDED: "text-on-surface-variant",
  };
  return map[status] ?? "text-on-surface-variant";
}

function getInvoiceStatusColor(status: InvoiceStatus) {
  const map: Record<InvoiceStatus, string> = {
    PAID: "text-success",
    OPEN: "text-warning",
    DRAFT: "text-on-surface-variant",
    VOID: "text-on-surface-variant",
    UNCOLLECTIBLE: "text-error",
  };
  return map[status] ?? "text-on-surface-variant";
}

// ─── Main Page ────────────────────────────────

export default function BillingPage() {
  usePageTitle("Billing");

  const user = useAuthStore((s) => s.user);
  const { data: plans, isLoading: plansLoading } = usePlans();
  const { data: subData, isLoading: subLoading } = useSubscription();
  const [paymentPage, setPaymentPage] = useState(1);
  const [invoicePage, setInvoicePage] = useState(1);
  const [historyTab, setHistoryTab] = useState("payments");
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const { data: selectedPayment } = usePayment(selectedPaymentId);
  const { data: selectedInvoice } = useInvoice(selectedInvoiceId);
  const { data: payments, isLoading: paymentsLoading } = usePayments({
    page: paymentPage,
    limit: PAGE_SIZE,
  });
  const { data: invoices, isLoading: invoicesLoading } = useInvoices({
    page: invoicePage,
    limit: PAGE_SIZE,
  });
  const subscribeMutation = useSubscribeToPlan();
  const changePlanMutation = useChangePlan();
  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const createOrder = useCreateOrder();
  const verifyPayment = useVerifyPayment();

  // Upgrade/downgrade confirmation modal state
  const [confirmPlan, setConfirmPlan] = useState<Plan | null>(null);
  // Billing cycle toggle for plan display
  const [showYearly, setShowYearly] = useState(false);
  // Plan change error (must be declared before any early returns)
  const [planChangeError, setPlanChangeError] = useState<string | null>(null);

  if (user?.role !== "ADMIN") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center">
          <ShieldAlert className="h-12 w-12 text-on-surface-variant/40 mx-auto mb-3" />
          <p className="text-[14px] text-on-surface-variant">
            You don&apos;t have permission to view billing.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = plansLoading || subLoading;
  const subscription = subData?.subscription ?? null;
  const usage = subData?.usage ?? null;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  const isAdmin = user?.role === "ADMIN";

  const canReactivate =
    isAdmin &&
    subscription &&
    ["CANCELLED", "EXPIRED", "GRACE_PERIOD", "PAST_DUE"].includes(
      subscription.status,
    );

  const handlePlanAction = async (plan: Plan) => {
    if (!isAdmin) return;

    // No subscription OR on trial — both require Razorpay payment for paid plans
    const needsPayment =
      (!subscription || subscription.status === "TRIAL") && plan.priceInCents > 0;

    if (needsPayment) {
      setPlanChangeError(null);
      const loaded = await loadRazorpayScript();
      if (!loaded) {
        setPlanChangeError("Failed to load payment gateway. Check your connection.");
        return;
      }
      createOrder.mutate(plan.id, {
        onSuccess: (order) => {
          const options = {
            key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
            amount: order.amount,
            currency: order.currency,
            name: "Wazelo CRM",
            description: subscription?.plan.id === plan.id
              ? `Activate ${order.planName} Plan`
              : `Subscribe to ${order.planName}`,
            order_id: order.orderId,
            handler: (response: any) => {
              verifyPayment.mutate(
                {
                  planId: plan.id,
                  orderId: response.razorpay_order_id,
                  razorpayPaymentId: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                  idempotencyKey: `billing-${user?.orgId ?? ""}-${plan.id}`,
                },
                {
                  onError: (err: any) => {
                    setPlanChangeError(err?.response?.data?.message ?? "Payment verification failed.");
                  },
                },
              );
            },
            prefill: {
              name: user ? `${user.firstName} ${user.lastName}` : "",
              email: user?.email ?? "",
            },
            theme: { color: "#6366F1" },
            modal: { ondismiss: () => setPlanChangeError("Payment cancelled. Try again.") },
          };
          new (window as any).Razorpay(options).open();
        },
        onError: (err: any) => {
          setPlanChangeError(err?.response?.data?.message ?? "Failed to create payment order.");
        },
      });
      return;
    }

    // No subscription + free plan (edge case) — direct subscribe
    if (!subscription) {
      subscribeMutation.mutate(plan.id);
      return;
    }

    // Active subscription — show upgrade/downgrade confirm modal
    setConfirmPlan(plan);
  };

  const handleConfirmChange = () => {
    if (!confirmPlan) return;
    setPlanChangeError(null);
    changePlanMutation.mutate(confirmPlan.id, {
      onSuccess: () => setConfirmPlan(null),
      onError: (err: any) => {
        const msg =
          err?.response?.data?.message ??
          err?.message ??
          "Failed to change plan. Please try again.";
        const violations: { metric: string; currentValue: number; newLimit: number }[] =
          err?.response?.data?.violations ?? [];
        if (violations.length > 0) {
          const details = violations
            .map((v) => `${v.metric.replace("_", " ")}: ${v.currentValue} active (limit: ${v.newLimit})`)
            .join(", ");
          setPlanChangeError(`Cannot downgrade: ${details}. Please reduce usage first.`);
        } else {
          setPlanChangeError(typeof msg === "string" ? msg : "Failed to change plan.");
        }
      },
    });
  };

  const isUpgrade = confirmPlan
    ? confirmPlan.priceInCents > (subscription?.plan.priceInCents ?? 0)
    : false;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto p-6 space-y-6">
        {/* Breadcrumb + Header */}
        <div>
          <p className="text-[12px] text-on-surface-variant/60 mb-1">
            Settings &gt; Billing
          </p>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-on-surface">
                Billing &amp; Subscription
              </h1>
              <p className="text-[13px] text-on-surface-variant mt-1">
                Manage your plan, track usage, and view payment history.
              </p>
            </div>
          </div>
        </div>

        {/* Current Plan — Gradient Hero Card */}
        {subscription && (
          <div className="rounded-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border border-primary/20 p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-on-surface">
                    {subscription.plan.name}
                  </h2>
                  {getStatusBadge(subscription.status)}
                </div>
                <p className="text-[13px] text-on-surface-variant">
                  Your current billing period:{" "}
                  <span className="text-on-surface">
                    {formatDate(subscription.currentPeriodStart)} —{" "}
                    {formatDate(subscription.currentPeriodEnd)}
                  </span>
                </p>
                <p className="text-3xl font-bold text-primary mt-2">
                  ₹{(subscription.plan.priceInCents / 100).toLocaleString("en-IN")}
                  <span className="text-sm font-normal text-on-surface-variant">
                    /{subscription.plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
                  </span>
                </p>
                {subscription.trialEndsAt && subscription.status === "TRIAL" && (
                  <p className="text-[12px] text-warning mt-1 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Trial ends {formatDate(subscription.trialEndsAt)}
                  </p>
                )}
                {subscription.scheduledPlanId && subscription.scheduledChangeAt && (
                  <p className="text-[12px] text-warning mt-1 flex items-center gap-1.5">
                    <ArrowDownCircle className="h-3.5 w-3.5" />
                    Downgrade scheduled for{" "}
                    {formatDate(subscription.scheduledChangeAt)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {canReactivate && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => reactivateMutation.mutate()}
                    loading={reactivateMutation.isPending}
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Reactivate
                  </Button>
                )}
                {isAdmin && subscription.status === "TRIAL" && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      // Scroll to plan tiers
                      document.getElementById("plan-tiers")?.scrollIntoView({ behavior: "smooth" });
                    }}
                  >
                    <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                    Upgrade to a Plan
                  </Button>
                )}
                {isAdmin && subscription.status === "ACTIVE" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => cancelMutation.mutate(undefined)}
                    disabled={cancelMutation.isPending}
                    className="text-error hover:text-error"
                  >
                    {cancelMutation.isPending ? "Cancelling..." : "Cancel Plan"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* No subscription state */}
        {!subscription && (
          <Card className="border-warning/20">
            <CardContent className="!mt-0 !py-8 text-center">
              <AlertTriangle className="h-10 w-10 text-warning mx-auto mb-3" />
              <p className="text-[15px] font-medium text-on-surface">
                No active subscription
              </p>
              <p className="text-[13px] text-on-surface-variant mt-1">
                Choose a plan below to get started.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Usage Metrics */}
        {usage && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-on-surface">
                Current Usage
              </h3>
              {subscription?.status === "TRIAL" && (
                <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5">
                  Trial limits active — upgrade to unlock full capacity
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
              <UsageCard
                icon={Users}
                label="Users"
                current={usage.activeUsers.current}
                limit={usage.activeUsers.limit}
                isTrial={subscription?.status === "TRIAL"}
              />
              <UsageCard
                icon={Smartphone}
                label="Sessions"
                current={usage.whatsappSessions.current}
                limit={usage.whatsappSessions.limit}
                isTrial={subscription?.status === "TRIAL"}
              />
              <UsageCard
                icon={MessageSquare}
                label="Messages"
                current={usage.messagesSent.current}
                limit={usage.messagesSent.limit}
                isTrial={subscription?.status === "TRIAL"}
              />
              <UsageCard
                icon={Zap}
                label="Campaigns"
                current={usage.campaignExecutions.current}
                limit={usage.campaignExecutions.limit}
                isTrial={subscription?.status === "TRIAL"}
              />
              <UsageCard
                icon={Code}
                label="API Calls"
                current={usage.apiCalls?.current ?? 0}
                limit={usage.apiCalls?.limit ?? 0}
                isTrial={subscription?.status === "TRIAL"}
              />
              <UsageCard
                icon={Sparkles}
                label="AI Credits"
                current={usage.aiCredits?.current ?? 0}
                limit={usage.aiCredits?.limit ?? 0}
                isTrial={subscription?.status === "TRIAL"}
              />
              <UsageCard
                icon={FileText}
                label="Templates"
                current={usage.messageTemplates?.current ?? 0}
                limit={usage.messageTemplates?.limit ?? 0}
                isTrial={subscription?.status === "TRIAL"}
              />
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        {plans && plans.length > 0 && (
          <div id="plan-tiers">
            {planChangeError && !confirmPlan && (
              <div className="mb-3 rounded-xl bg-error/10 border border-error/30 px-4 py-3 text-sm text-error flex items-center justify-between">
                <span>{planChangeError}</span>
                <button onClick={() => setPlanChangeError(null)} className="ml-3 text-error/60 hover:text-error">✕</button>
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[14px] font-semibold text-on-surface">
                Subscription Tiers
              </h3>
              {/* Monthly / Yearly toggle */}
              <div className="flex items-center gap-2.5">
                <span className={`text-[13px] font-medium ${!showYearly ? "text-on-surface" : "text-on-surface-variant"}`}>
                  Monthly
                </span>
                <button
                  onClick={() => setShowYearly((v) => !v)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${showYearly ? "bg-primary" : "bg-surface-container-high"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showYearly ? "translate-x-5" : "translate-x-0"}`}
                  />
                </button>
                <span className={`text-[13px] font-medium ${showYearly ? "text-on-surface" : "text-on-surface-variant"}`}>
                  Yearly
                  <span className="ml-1.5 bg-success/10 text-success text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                    Save 17%
                  </span>
                </span>
              </div>
            </div>
            {(() => {
              const sortedVisiblePlans = plans
                .filter((p) => p.isActive && p.slug !== "free-trial" && p.billingCycle === (showYearly ? "YEARLY" : "MONTHLY"))
                .sort((a, b) => a.sortOrder - b.sortOrder);
              const popularIndex = Math.floor(sortedVisiblePlans.length / 2);
              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedVisiblePlans.map((plan, idx) => {
                    const isCurrent = subscription?.plan.id === plan.id;
                    const isEnterprise = plan.name === "Enterprise";
                    const hasSubscription = !!subscription;
                    return (
                      <PlanCard
                        key={plan.id}
                        plan={plan}
                        isCurrent={isCurrent}
                        isEnterprise={isEnterprise}
                        isPopular={idx === popularIndex && !isEnterprise && !isCurrent}
                        onSelect={() => handlePlanAction(plan)}
                        isLoading={
                          subscribeMutation.isPending || changePlanMutation.isPending ||
                          createOrder.isPending || verifyPayment.isPending
                        }
                        disabled={!isAdmin || isEnterprise}
                        isTrial={isCurrent && subscription?.status === "TRIAL"}
                        buttonLabel={
                          isCurrent
                            ? subscription?.status === "TRIAL" ? "On Trial" : "Active Plan"
                            : isEnterprise
                              ? "Contact Us"
                              : !isAdmin
                                ? "View Only"
                                : !hasSubscription
                                  ? "Select Plan"
                                  : subscription?.status === "TRIAL" && plan.priceInCents > 0
                                    ? "Pay & Upgrade"
                                    : plan.priceInCents > (subscription?.plan.priceInCents ?? 0)
                                      ? "Upgrade"
                                      : "Downgrade"
                        }
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* Billing History — Payments & Invoices */}
        <Card>
          <div className="p-6 pb-0">
            <h3 className="text-lg font-semibold text-on-surface mb-4">
              Billing History
            </h3>
            <Tabs
              tabs={[
                { id: "payments", label: "Payments" },
                { id: "invoices", label: "Invoices" },
              ]}
              activeTab={historyTab}
              onTabChange={setHistoryTab}
            />
          </div>

          {/* Payments Tab */}
          {historyTab === "payments" && (
            <div className="mt-4">
              {paymentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" className="text-primary" />
                </div>
              ) : !payments?.data?.length ? (
                <div className="text-center py-12">
                  <CreditCard className="h-10 w-10 text-on-surface-variant/30 mx-auto mb-3" />
                  <p className="text-[13px] text-on-surface-variant">
                    No payment history yet
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableHeaderRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead align="right">&nbsp;</TableHead>
                      </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {payments.data.map((payment) => (
                        <TableRow
                          key={payment.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedPaymentId(payment.id)}
                        >
                          <TableCell className="text-[13px] text-on-surface">
                            {formatDate(payment.createdAt)}
                          </TableCell>
                          <TableCell className="text-[13px] text-on-surface font-medium">
                            ₹{(payment.amountInCents / 100).toLocaleString("en-IN")}{" "}
                            <span className="text-[11px] text-on-surface-variant font-normal">
                              {payment.currency}
                            </span>
                          </TableCell>
                          <TableCell className="text-[13px] text-on-surface-variant capitalize">
                            {payment.paymentMethod?.replace("_", " ") ?? "—"}
                          </TableCell>
                          <TableCell>
                            <span className={`text-[12px] font-medium ${getPaymentStatusColor(payment.status)}`}>
                              {payment.status}
                            </span>
                          </TableCell>
                          <TableCell align="right">
                            <span className="text-[12px] text-primary font-medium">View →</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={paymentPage}
                    totalPages={payments.totalPages}
                    total={payments.total}
                    onPageChange={setPaymentPage}
                  />
                </>
              )}
            </div>
          )}

          {/* Invoices Tab */}
          {historyTab === "invoices" && (
            <div className="mt-4">
              {invoicesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" className="text-primary" />
                </div>
              ) : !invoices?.data?.length ? (
                <div className="text-center py-12">
                  <FileText className="h-10 w-10 text-on-surface-variant/30 mx-auto mb-3" />
                  <p className="text-[13px] text-on-surface-variant">
                    No invoices yet
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableHeaderRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Period</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead align="right">Action</TableHead>
                      </TableHeaderRow>
                    </TableHeader>
                    <TableBody>
                      {invoices.data.map((invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer"
                          onClick={() => setSelectedInvoiceId(invoice.id)}
                        >
                          <TableCell className="text-[13px] text-on-surface font-medium">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="text-[13px] text-on-surface-variant">
                            {formatDate(invoice.periodStart)} — {formatDate(invoice.periodEnd)}
                          </TableCell>
                          <TableCell className="text-[13px] text-on-surface font-medium">
                            ₹{(invoice.amountInCents / 100).toLocaleString("en-IN")}{" "}
                            <span className="text-[11px] text-on-surface-variant font-normal">
                              {invoice.currency}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`text-[12px] font-medium ${getInvoiceStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </TableCell>
                          <TableCell align="right">
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-primary font-medium">
                              <Download className="h-3.5 w-3.5" />
                              View &amp; Download
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <Pagination
                    page={invoicePage}
                    totalPages={invoices.totalPages}
                    total={invoices.total}
                    onPageChange={setInvoicePage}
                  />
                </>
              )}
            </div>
          )}
        </Card>
      </div>

      {/* Upgrade/Downgrade Confirmation Modal */}
      {confirmPlan && subscription && (
        <UpgradeConfirmModal
          currentPlan={subscription.plan}
          newPlan={confirmPlan}
          isUpgrade={isUpgrade}
          isLoading={changePlanMutation.isPending}
          error={planChangeError}
          onConfirm={handleConfirmChange}
          onCancel={() => { setConfirmPlan(null); setPlanChangeError(null); }}
        />
      )}

      {/* Payment detail modal */}
      {selectedPaymentId && selectedPayment && (
        <PaymentDetailModal
          payment={selectedPayment}
          onClose={() => setSelectedPaymentId(null)}
        />
      )}

      {/* Invoice detail + PDF modal */}
      {selectedInvoiceId && selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          user={user}
          onClose={() => setSelectedInvoiceId(null)}
        />
      )}
    </div>
  );
}

// ─── Usage Card (Stitch-aligned) ──────────────

function UsageCard({
  icon: Icon,
  label,
  current,
  limit,
  isTrial = false,
}: {
  icon: typeof Users;
  label: string;
  current: number;
  limit: number;
  isTrial?: boolean;
}) {
  const pct = limit > 0 ? Math.min((current / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isAtLimit = pct >= 100;

  return (
    <Card className="!p-0 overflow-hidden">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-surface-container-high flex items-center justify-center">
              <Icon className="h-4 w-4 text-on-surface-variant" />
            </div>
            <span className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
              {label}
            </span>
          </div>
          {isAtLimit && (
            <AlertTriangle className="h-4 w-4 text-error" />
          )}
          {isNearLimit && !isAtLimit && (
            <AlertTriangle className="h-4 w-4 text-warning" />
          )}
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-xl font-bold text-on-surface">
            {current.toLocaleString()}
          </span>
          <span className="text-[12px] text-on-surface-variant">
            / {limit > 0 ? limit.toLocaleString() : "∞"}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[11px] text-on-surface-variant/60">
            {pct.toFixed(0)}% used
          </span>
          {isTrial && (
            <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
              trial limit
            </span>
          )}
        </div>
      </div>
      {/* Progress bar at bottom edge */}
      <div className="h-1 bg-surface-container-high">
        <div
          className={`h-full transition-all ${
            isAtLimit
              ? "bg-error"
              : isNearLimit
                ? "bg-warning"
                : "bg-primary"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </Card>
  );
}

// ─── Feature+Limit helpers ─────────────────────

function fmtFeatureLimit(value: number | undefined | null, suffix: string): string {
  if (value == null) return "Included";
  if (value === 0) return "Unlimited";
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k${suffix}`;
  return `${value}${suffix}`;
}

function FeatureLimitRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-1.5">
        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[12px] text-on-surface-variant">{label}</span>
      </div>
      <span className="text-[12px] font-medium text-on-surface">{value}</span>
    </div>
  );
}

// ─── Plan Card ─────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  isEnterprise,
  onSelect,
  isLoading,
  disabled,
  buttonLabel,
  isTrial,
  isPopular,
}: {
  plan: Plan;
  isCurrent: boolean;
  isEnterprise?: boolean;
  onSelect: () => void;
  isLoading: boolean;
  disabled?: boolean;
  buttonLabel: string;
  isTrial?: boolean;
  isPopular?: boolean;
}) {
  return (
    <Card
      className={`!p-0 overflow-hidden flex flex-col ${
        isCurrent
          ? "border-primary/30 ring-1 ring-primary/20"
          : isPopular
            ? "border-primary/40 ring-2 ring-primary/20 shadow-lg"
            : isEnterprise
              ? "border-on-surface/10 bg-surface-container-low"
              : "hover:border-outline-variant/30 transition-colors"
      }`}
    >
      {/* Top banner — Active > Popular > Enterprise */}
      {isCurrent ? (
        <div className="bg-primary/10 px-4 py-1.5 text-center">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
            Active Plan
          </span>
        </div>
      ) : isPopular ? (
        <div className="bg-primary px-4 py-1.5 text-center">
          <span className="text-[11px] font-semibold text-white uppercase tracking-wider">
            Most Popular
          </span>
        </div>
      ) : isEnterprise ? (
        <div className="bg-on-surface/5 px-4 py-1.5 text-center">
          <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
            Custom Pricing
          </span>
        </div>
      ) : (
        <div className="py-1.5" />
      )}

      <div className="p-5 flex flex-col flex-1">
        {/* Plan name + description */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-on-surface">
            {plan.name}
          </h3>
          {plan.description && (
            <p className="text-[12px] text-on-surface-variant/70 mt-0.5 min-h-[32px]">
              {plan.description}
            </p>
          )}
        </div>

        {/* Price */}
        <div className="mb-4">
          {isEnterprise ? (
            <span className="text-2xl font-bold text-on-surface">Custom</span>
          ) : (
            <>
              <span className="text-2xl font-bold text-on-surface">
                {formatPlanPrice(plan)}
              </span>
              <span className="text-[13px] text-on-surface-variant">
                /{plan.billingCycle === "MONTHLY" ? "mo" : "yr"}
              </span>
            </>
          )}
          {isTrial ? (
            <p className="text-[11px] text-amber-600 font-medium mt-1 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Trial active — limited capacity
            </p>
          ) : !isCurrent && plan.trialDays > 0 ? (
            <p className="text-[11px] text-success font-medium mt-1">
              {plan.trialDays}-day free trial
            </p>
          ) : null}
        </div>

        {/* ── Section A: Usage ── */}
        <div className="space-y-2 mb-3">
          <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mb-2">
            Usage
          </p>
          <LimitRow
            label="Users"
            value={formatLimit(plan.maxUsers)}
            trialValue={isTrial && plan.trialMaxUsers != null ? plan.trialMaxUsers : undefined}
          />
          <LimitRow
            label="Sessions"
            value={formatLimit(plan.maxWhatsappSessions)}
            trialValue={isTrial && plan.trialMaxWhatsappSessions != null ? plan.trialMaxWhatsappSessions : undefined}
          />
          <LimitRow
            label="Messages/mo"
            value={formatLimit(plan.maxMessagesPerMonth)}
            trialValue={isTrial && plan.trialMaxMessagesPerMonth != null ? plan.trialMaxMessagesPerMonth : undefined}
          />
          <LimitRow
            label="Campaigns/mo"
            value={formatLimit(plan.maxCampaignsPerMonth)}
            trialValue={isTrial && plan.trialMaxCampaignsPerMonth != null ? plan.trialMaxCampaignsPerMonth : undefined}
          />
        </div>

        {/* ── Section B: Features with limits ── */}
        <div className="border-t border-outline-variant/10 pt-3 space-y-2">
          <p className="text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-widest mb-2">
            Features
          </p>
          <FeatureLimitRow label="Templates"   value={fmtFeatureLimit(plan.maxMessageTemplates, "")} />
          <FeatureLimitRow label="API Access"  value={fmtFeatureLimit(plan.maxApiCallsPerMonth, "/mo")} />
          <FeatureLimitRow label="AI Credits"  value={fmtFeatureLimit(plan.aiCreditsPerMonth, "/mo")} />
          <FeatureLimitRow label="Shopify"     value={fmtFeatureLimit(plan.maxShopifyStores, plan.maxShopifyStores === 1 ? " store" : " stores")} />
          <FeatureLimitRow label="Automation"  value="Included" />
        </div>

        <div className="flex-1" />

        {/* Action Button */}
        {isEnterprise && !isCurrent ? (
          <a
            href="mailto:sales@wazelo.in"
            className="mt-4 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-on-surface/20 px-3 py-2 text-[13px] font-medium text-on-surface hover:bg-surface-container transition-colors"
          >
            Contact Us
          </a>
        ) : (
          <Button
            className="w-full mt-4"
            variant={
              isCurrent
                ? "secondary"
                : isPopular || buttonLabel === "Upgrade" || buttonLabel === "Pay & Upgrade"
                  ? "primary"
                  : "secondary"
            }
            size="sm"
            disabled={isCurrent || isLoading || disabled}
            onClick={onSelect}
          >
            {isCurrent ? (
              "Active Plan"
            ) : isLoading ? (
              "Processing..."
            ) : buttonLabel === "Upgrade" || buttonLabel === "Pay & Upgrade" ? (
              <>
                <ArrowUpCircle className="h-3.5 w-3.5 mr-1.5" />
                {buttonLabel}
              </>
            ) : buttonLabel === "Downgrade" ? (
              <>
                <ArrowDownCircle className="h-3.5 w-3.5 mr-1.5" />
                {buttonLabel}
              </>
            ) : (
              buttonLabel
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}

// ─── Upgrade Confirmation Modal (from Stitch) ──

function UpgradeConfirmModal({
  currentPlan,
  newPlan,
  isUpgrade,
  isLoading,
  error,
  onConfirm,
  onCancel,
}: {
  currentPlan: SubscriptionPlanSummary;
  newPlan: Plan;
  isUpgrade: boolean;
  isLoading: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const currentPrice = currentPlan.priceInCents / 100;
  const newPrice = newPlan.priceInCents / 100;
  const cycleSuffix = newPlan.billingCycle === "MONTHLY" ? "mo" : "yr";

  // Estimate proration for upgrades (approximate — server calculates exact)
  const daysInPeriod = newPlan.billingCycle === "MONTHLY" ? 30 : 365;
  const estimatedDaysRemaining = Math.round(daysInPeriod / 2); // rough midpoint
  const credit = (currentPrice / daysInPeriod) * estimatedDaysRemaining;
  const charge = (newPrice / daysInPeriod) * estimatedDaysRemaining;
  const net = charge - credit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />
      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/20 shadow-2xl mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-0">
          <div className="flex items-center gap-2">
            {isUpgrade ? (
              <TrendingUp className="h-5 w-5 text-primary" />
            ) : (
              <ArrowDownCircle className="h-5 w-5 text-warning" />
            )}
            <h2 className="text-lg font-semibold text-on-surface">
              {isUpgrade ? "Confirm Upgrade" : "Confirm Downgrade"}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Plan Comparison */}
          <div className="flex items-center gap-4">
            <div className="flex-1 rounded-xl bg-surface-container p-4 text-center">
              <p className="text-[11px] text-on-surface-variant uppercase tracking-wider mb-1">
                Current
              </p>
              <p className="text-[15px] font-semibold text-on-surface">
                {currentPlan.name}
              </p>
              <p className="text-sm text-on-surface-variant mt-0.5">
                ₹{currentPrice.toLocaleString("en-IN")}/{cycleSuffix}
              </p>
            </div>
            <div className="text-on-surface-variant/50">→</div>
            <div className="flex-1 rounded-xl bg-primary/10 border border-primary/20 p-4 text-center">
              <p className="text-[11px] text-primary uppercase tracking-wider mb-1">
                New Plan
              </p>
              <p className="text-[15px] font-semibold text-on-surface">
                {newPlan.name}
              </p>
              <p className="text-sm text-primary mt-0.5">
                ₹{newPrice.toLocaleString("en-IN")}/{cycleSuffix}
              </p>
            </div>
          </div>

          {/* Feature Comparison Table */}
          <div className="rounded-xl bg-surface-container/50 overflow-hidden">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-surface-container/40 border-b border-outline-variant/15">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Feature
                  </th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                    Current
                  </th>
                  <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-primary">
                    New
                  </th>
                </tr>
              </thead>
              <tbody>
                <CompareRow
                  label="Users"
                  current={formatLimit(currentPlan.maxUsers)}
                  next={formatLimit(newPlan.maxUsers)}
                />
                <CompareRow
                  label="Sessions"
                  current={formatLimit(currentPlan.maxWhatsappSessions)}
                  next={formatLimit(newPlan.maxWhatsappSessions)}
                />
                <CompareRow
                  label="Messages/mo"
                  current={formatLimit(currentPlan.maxMessagesPerMonth)}
                  next={formatLimit(newPlan.maxMessagesPerMonth)}
                />
                <CompareRow
                  label="Campaigns/mo"
                  current={formatLimit(currentPlan.maxCampaignsPerMonth)}
                  next={formatLimit(newPlan.maxCampaignsPerMonth)}
                />
                <CompareRow
                  label="Templates"
                  current={formatLimit(currentPlan.maxMessageTemplates)}
                  next={formatLimit(newPlan.maxMessageTemplates)}
                />
                <CompareRow
                  label="API Calls/mo"
                  current={currentPlan.apiEnabled ? formatLimit(currentPlan.maxApiCallsPerMonth) : "—"}
                  next={newPlan.apiEnabled ? formatLimit(newPlan.maxApiCallsPerMonth) : "—"}
                />
                <CompareRow
                  label="AI Credits/mo"
                  current={currentPlan.aiEnabled ? formatLimit(currentPlan.aiCreditsPerMonth) : "—"}
                  next={newPlan.aiEnabled ? formatLimit(newPlan.aiCreditsPerMonth) : "—"}
                />
              </tbody>
            </table>
          </div>

          {/* Proration Details (upgrades only) */}
          {isUpgrade && (
            <div className="rounded-xl bg-surface-container p-4 space-y-2">
              <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wider">
                Estimated Proration
              </p>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-on-surface-variant">
                  Credit for remaining period
                </span>
                <span className="text-success font-medium">
                  -₹{credit.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-on-surface-variant">
                  New plan charge (prorated)
                </span>
                <span className="text-on-surface font-medium">
                  ₹{charge.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="border-t border-outline-variant/15 pt-2 mt-2">
                <div className="flex items-center justify-between text-[14px] font-semibold">
                  <span className="text-on-surface">Amount due today</span>
                  <span className="text-primary">₹{net.toLocaleString("en-IN")}</span>
                </div>
              </div>
              <p className="text-[11px] text-on-surface-variant/60 mt-1">
                Exact proration will be calculated by the server based on your
                current billing period.
              </p>
            </div>
          )}

          {/* Downgrade note */}
          {!isUpgrade && (
            <div className="rounded-xl bg-warning-container/30 border border-warning/10 p-4">
              <p className="text-[13px] text-on-surface">
                Your downgrade will take effect at the end of your current
                billing period. You&apos;ll keep your current plan until then.
              </p>
            </div>
          )}

          {/* Actions */}
          {error && (
            <div className="rounded-lg bg-error/10 border border-error/20 px-4 py-3 text-[13px] text-error">
              {error}
            </div>
          )}
          <div className="flex items-center justify-end gap-3 pt-1">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirm}
              loading={isLoading}
              disabled={!!error}
            >
              {isUpgrade ? "Confirm Upgrade" : "Confirm Downgrade"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  current,
  next,
}: {
  label: string;
  current: string;
  next: string;
}) {
  return (
    <tr className="border-b border-outline-variant/10 last:border-0">
      <td className="px-4 py-2.5 text-on-surface-variant">{label}</td>
      <td className="px-4 py-2.5 text-center text-on-surface-variant">
        {current}
      </td>
      <td className="px-4 py-2.5 text-center text-on-surface font-medium">
        {next}
      </td>
    </tr>
  );
}

function LimitRow({
  label,
  value,
  trialValue,
}: {
  label: string;
  value: string;
  trialValue?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-on-surface-variant">{label}</span>
      <div className="flex items-center gap-1.5">
        {trialValue !== undefined ? (
          <span className="flex items-center gap-1">
            <span className="text-[12px] font-medium text-amber-700">{trialValue.toLocaleString()}</span>
            <span className="text-[10px] text-on-surface-variant/50 line-through">{value}</span>
          </span>
        ) : (
          <span className="text-[12px] font-medium text-on-surface">{value}</span>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLimit(value: number | undefined | null): string {
  if (value == null) return "—";
  if (value <= 0) return "Unlimited";
  if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toLocaleString();
}
