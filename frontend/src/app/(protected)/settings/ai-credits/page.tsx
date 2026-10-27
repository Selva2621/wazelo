"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/use-page-title";
import { useAuthStore } from "@/stores/auth-store";
import {
  useAiCreditHistory,
  useAiCredits,
  useCreateAiCreditOrder,
  useVerifyAiCreditPayment,
} from "@/hooks/use-ai-credits";
import type { AiCreditEntry, AiCreditPackOffer, AiCreditWallet } from "@/lib/api/ai-credits";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn, formatMoney } from "@/lib/utils";

const sectionClass = "bg-surface-container-low border border-outline-variant rounded-xl";
const HISTORY_PAGE_SIZE = 20;
const n = (value: number) => value.toLocaleString("en-IN");

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
type RazorpayWindow = Window & { Razorpay?: new (options: Record<string, unknown>) => { open: () => void } };

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as RazorpayWindow).Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function BalanceCard({ wallet }: { wallet: AiCreditWallet }) {
  const { plan } = wallet;
  const percent = plan.unlimited || plan.limit === 0 ? 0 : Math.min(100, Math.round((plan.used / plan.limit) * 100));
  const resets = plan.resetsAt
    ? new Date(plan.resetsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <section aria-labelledby="balance-heading" className={cn(sectionClass, "p-5 space-y-4")}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="balance-heading" className="text-body-lg font-medium text-on-surface-variant">
          Balance
        </h2>
        <p className="text-headline font-semibold tabular-nums text-on-surface">
          {wallet.available === null ? "Unlimited" : n(wallet.available)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <div className="flex justify-between text-body">
            <span className="text-on-surface-variant">Plan</span>
            <span className="tabular-nums text-on-surface">
              {plan.unlimited ? "Unlimited" : `${n(plan.used)} / ${n(plan.limit)} used`}
            </span>
          </div>
          {!plan.unlimited && (
            <div
              className="h-1.5 rounded-full bg-surface-container-high overflow-hidden"
              role="progressbar"
              aria-label="Plan AI credits used"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={cn("h-full rounded-full", percent >= 100 ? "bg-error" : percent >= 80 ? "bg-warning" : "bg-primary")}
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
          {resets && <p className="text-label text-on-surface-variant">Resets {resets}</p>}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-body">
            <span className="text-on-surface-variant">Extra</span>
            <span className="tabular-nums text-on-surface">{n(wallet.purchased)}</span>
          </div>
          <p className="text-label text-on-surface-variant">Never expire. Used after plan credits.</p>
        </div>
      </div>
    </section>
  );
}

function PackGrid({
  packs,
  canBuy,
  buyingId,
  onBuy,
}: {
  packs: AiCreditPackOffer[];
  canBuy: boolean;
  buyingId: string | null;
  onBuy: (pack: AiCreditPackOffer) => void;
}) {
  return (
    <section aria-labelledby="packs-heading" className="space-y-3">
      <h2 id="packs-heading" className="text-title-sm font-semibold text-on-surface">
        Buy credits
      </h2>
      {packs.length === 0 ? (
        <p className={cn(sectionClass, "p-5 text-body text-on-surface-variant")}>No credit packs on sale right now.</p>
      ) : (
        <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <li key={pack.id} className={cn(sectionClass, "p-5 flex flex-col gap-3")}>
              <div>
                <p className="text-label text-on-surface-variant">{pack.name}</p>
                <p className="text-title font-semibold tabular-nums text-on-surface">{n(pack.credits)}</p>
                <p className="text-body text-on-surface-variant">{formatMoney(pack.priceInCents, pack.currency)}</p>
              </div>
              <Button
                onClick={() => onBuy(pack)}
                disabled={!canBuy || (buyingId !== null && buyingId !== pack.id)}
                loading={buyingId === pack.id}
                aria-label={`Buy ${n(pack.credits)} credits for ${formatMoney(pack.priceInCents, pack.currency)}`}
              >
                Buy
              </Button>
            </li>
          ))}
        </ul>
      )}
      {!canBuy && packs.length > 0 && (
        <p className="text-label text-on-surface-variant">Ask an admin or manager to buy credits.</p>
      )}
    </section>
  );
}

function entryChange(e: AiCreditEntry): { text: string; positive: boolean } {
  if (e.kind === "PURCHASE") return { text: `+${n(e.purchasedCredits)}`, positive: true };
  const spent = e.planCredits - e.purchasedCredits;
  return { text: spent === 0 ? "0" : `−${n(spent)}`, positive: false };
}

const historyColumns: DataTableColumn<AiCreditEntry>[] = [
  {
    id: "date",
    header: "Date",
    cellClassName: "whitespace-nowrap text-on-surface-variant",
    cell: (e) =>
      new Date(e.createdAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
  },
  {
    id: "activity",
    header: "Activity",
    cell: (e) => (e.kind === "PURCHASE" ? "Purchased credits" : e.label ?? e.action ?? "AI"),
  },
  {
    id: "credits",
    header: "Credits",
    align: "right",
    skeleton: "short",
    cell: (e) => {
      const change = entryChange(e);
      return (
        <span className={cn("tabular-nums", change.positive ? "text-success" : "text-on-surface")}>{change.text}</span>
      );
    },
  },
];

function HistoryTable() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAiCreditHistory(page);

  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <h2 id="history-heading" className="text-title-sm font-semibold text-on-surface">
        History
      </h2>
      <div className={cn(sectionClass, "overflow-x-auto")}>
        <DataTable
          label="AI credit history"
          columns={historyColumns}
          rows={data?.entries ?? []}
          rowKey={(e) => e.id}
          loading={isLoading}
          skeletonRows={5}
          pagination={{
            page: page - 1,
            pageSize: HISTORY_PAGE_SIZE,
            total: data?.total ?? 0,
            onPageChange: (p) => setPage(p + 1),
          }}
          empty={{
            icon: <Sparkles className="h-10 w-10" />,
            title: "No AI usage yet",
            compact: true,
          }}
        />
      </div>
    </section>
  );
}

export default function AiCreditsPage() {
  usePageTitle("AI Credits");
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useAiCredits();
  const createOrder = useCreateAiCreditOrder();
  const verify = useVerifyAiCreditPayment();
  const [buyingId, setBuyingId] = useState<string | null>(null);

  const canBuy = user?.role === "ADMIN" || user?.role === "MANAGER";

  const buy = async (pack: AiCreditPackOffer) => {
    const razorpayKey = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKey) {
      toast.error("Payments aren't set up yet. Contact support.");
      return;
    }
    setBuyingId(pack.id);
    if (!(await loadRazorpayScript())) {
      toast.error("Couldn't load the payment gateway. Check your connection.");
      setBuyingId(null);
      return;
    }
    createOrder.mutate(pack.id, {
      onSuccess: (order) => {
        const Razorpay = (window as RazorpayWindow).Razorpay!;
        new Razorpay({
          key: razorpayKey,
          amount: order.amount,
          currency: order.currency,
          name: "Wazelo CRM",
          description: `${n(order.credits)} AI credits`,
          order_id: order.orderId,
          prefill: { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email ?? "" },
          theme: { color: "#d97706" },
          handler: (response: RazorpayResponse) => {
            verify.mutate(
              {
                orderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              },
              {
                onSuccess: (res) => toast.success(`${n(res.credits)} credits added`),
                onError: (err: Error) =>
                  toast.error(err?.message || "Payment received but not confirmed yet. Credits will appear shortly."),
                onSettled: () => setBuyingId(null),
              },
            );
          },
          modal: { ondismiss: () => setBuyingId(null) },
        }).open();
      },
      onError: (err: Error) => {
        toast.error(err?.message || "Couldn't start the payment.");
        setBuyingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-6" role="status">
        <Spinner size="lg" className="text-primary" />
        <span className="sr-only">Loading AI credits…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="p-6 max-w-3xl">
        <Alert variant="error">
          Couldn&apos;t load AI credits.{" "}
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded underline hover:no-underline outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            Try again
          </button>
        </Alert>
      </div>
    );
  }

  const outOfCredits = data.wallet.available === 0;

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-6 space-y-6 max-w-3xl">
        <div className="space-y-1 max-lg:hidden">
          <Link
            href="/settings/billing"
            className="inline-flex items-center gap-1 rounded text-label text-on-surface-variant hover:text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Billing
          </Link>
          <PageHeader title="AI credits" />
        </div>

        {outOfCredits && (
          <Alert variant="warning">AI features are paused until you buy credits or your plan resets.</Alert>
        )}

        <BalanceCard wallet={data.wallet} />
        <PackGrid packs={data.packs} canBuy={canBuy} buyingId={buyingId} onBuy={buy} />

        {data.costs.length > 0 && (
          <details className={cn(sectionClass, "p-5 group")}>
            <summary className="cursor-pointer text-body font-medium text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus rounded">
              Credits per action
            </summary>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {data.costs.map((c) => (
                <li key={c.action} className="flex justify-between text-body">
                  <span className="text-on-surface-variant">{c.label}</span>
                  <span className="tabular-nums text-on-surface">{c.cost}</span>
                </li>
              ))}
            </ul>
          </details>
        )}

        <HistoryTable />
      </div>
    </div>
  );
}
