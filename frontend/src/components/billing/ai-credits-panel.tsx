"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  AI_CREDIT_HISTORY_PAGE_SIZE,
  useAiCreditHistory,
  useAiCredits,
  useCreateAiCreditOrder,
  useVerifyAiCreditPayment,
} from "@/hooks/use-ai-credits";
import { useAuthStore } from "@/stores/auth-store";
import type { AiCreditEntry, AiCreditPackOffer, AiCreditWallet } from "@/lib/api/ai-credits";
import { loadRazorpayScript, openRazorpayCheckout, RAZORPAY_THEME_COLOR, type RazorpayResponse } from "@/lib/razorpay";
import { cn, formatMoney } from "@/lib/utils";
import { billingCard } from "./billing-format";
import { UsageMeter } from "./usage-meter";

const n = (value: number) => value.toLocaleString("en-IN");

export function AiCreditsPanel() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useAiCredits();
  const createOrder = useCreateAiCreditOrder();
  const verify = useVerifyAiCreditPayment();
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const canBuy = user?.role === "ADMIN" || user?.role === "MANAGER";

  const buy = async (pack: AiCreditPackOffer) => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
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
        openRazorpayCheckout({
          key,
          amount: order.amount,
          currency: order.currency,
          name: "Wazelo CRM",
          description: `${n(order.credits)} AI credits`,
          order_id: order.orderId,
          prefill: { name: user ? `${user.firstName} ${user.lastName}` : "", email: user?.email ?? "" },
          theme: { color: RAZORPAY_THEME_COLOR },
          handler: (res: RazorpayResponse) => {
            verify.mutate(
              {
                orderId: res.razorpay_order_id,
                razorpayPaymentId: res.razorpay_payment_id,
                signature: res.razorpay_signature,
              },
              {
                onSuccess: (r) => toast.success(`${n(r.credits)} credits added`),
                onError: (err: Error) =>
                  toast.error(err?.message || "Payment received but not confirmed yet. Credits will appear shortly."),
                onSettled: () => setBuyingId(null),
              },
            );
          },
          modal: { ondismiss: () => setBuyingId(null) },
        });
      },
      onError: (err: Error) => {
        toast.error(err?.message || "Couldn't start the payment.");
        setBuyingId(null);
      },
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16" role="status">
        <Spinner size="lg" className="text-primary" />
        <span className="sr-only">Loading AI credits…</span>
      </div>
    );
  }

  if (isError || !data) {
    return (
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
    );
  }

  return (
    <div className="space-y-4">
      {data.wallet.available === 0 && (
        <Alert variant="warning">AI features are paused until you buy credits or your plan resets.</Alert>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Balance wallet={data.wallet} />
        <Packs packs={data.packs} canBuy={canBuy} buyingId={buyingId} onBuy={buy} />
      </div>

      {data.costs.length > 0 && (
        <details className={cn(billingCard, "group p-5")}>
          <summary className="cursor-pointer rounded text-body font-medium text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-focus">
            Credits per action
          </summary>
          <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.costs.map((c) => (
              <div key={c.action} className="flex justify-between gap-3 text-body">
                <dt className="text-on-surface-variant">{c.label}</dt>
                <dd className="tabular-nums text-on-surface">{c.cost}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <CreditHistory />
    </div>
  );
}

function Balance({ wallet }: { wallet: AiCreditWallet }) {
  const { plan } = wallet;
  const resets = plan.resetsAt
    ? new Date(plan.resetsAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    : null;

  return (
    <section aria-labelledby="balance-heading" className={cn(billingCard, "flex flex-col p-6")}>
      <h2 id="balance-heading" className="text-title-sm font-semibold text-on-surface">
        Balance
      </h2>
      <p className="mt-3 text-display font-semibold tabular-nums text-on-surface">
        {wallet.available === null ? "Unlimited" : n(wallet.available)}
        <span className="ml-2 text-body font-normal text-on-surface-variant">credits left</span>
      </p>

      <div className="mt-6 space-y-5 border-t border-outline-variant pt-5">
        <div>
          <UsageMeter
            label="Plan credits this month"
            current={plan.used}
            limit={plan.unlimited ? 0 : plan.limit}
          />
          {resets && <p className="mt-1.5 text-caption text-on-surface-variant">Resets {resets}</p>}
        </div>
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-label text-on-surface-variant">Bought credits</p>
            <p className="text-caption text-on-surface-variant">Never expire. Used after plan credits.</p>
          </div>
          <p className="text-title-sm font-semibold tabular-nums text-on-surface">{n(wallet.purchased)}</p>
        </div>
      </div>
    </section>
  );
}

function Packs({
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
  // Best per-credit price gets a "best value" tag
  const bestId =
    packs.length > 1
      ? packs.reduce((best, p) => (p.priceInCents / p.credits < best.priceInCents / best.credits ? p : best)).id
      : null;

  return (
    <section aria-labelledby="packs-heading" className={cn(billingCard, "flex flex-col p-6")}>
      <h2 id="packs-heading" className="text-title-sm font-semibold text-on-surface">
        Buy credits
      </h2>
      {packs.length === 0 ? (
        <p className="mt-3 text-body text-on-surface-variant">No credit packs on sale right now.</p>
      ) : (
        <ul className="mt-2 flex-1 divide-y divide-outline-variant">
          {packs.map((pack) => (
            <li key={pack.id} className="flex items-center gap-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-on-surface">
                  <span className="text-title-sm font-semibold tabular-nums">{n(pack.credits)}</span>
                  <span className="text-label text-on-surface-variant">credits</span>
                  {pack.id === bestId && <span className="text-caption font-medium text-success">Best value</span>}
                </p>
                <p className="truncate text-label text-on-surface-variant">{pack.name}</p>
              </div>
              <p className="text-body font-medium tabular-nums text-on-surface">
                {formatMoney(pack.priceInCents, pack.currency)}
              </p>
              <Button
                size="sm"
                variant="secondary"
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
        <p className="mt-3 text-label text-on-surface-variant">Ask an admin or manager to buy credits.</p>
      )}
    </section>
  );
}

// ─── Credit activity: a feed grouped by day ───

interface ActivityRow {
  entry: AiCreditEntry;
  /** Credits taken (usage) or added (purchase), always positive */
  amount: number;
  purchase: boolean;
  /** Where spent credits came from */
  source: "Plan" | "Bought" | "Plan + bought" | null;
}

function toRow(e: AiCreditEntry): ActivityRow {
  if (e.kind === "PURCHASE") return { entry: e, amount: e.purchasedCredits, purchase: true, source: null };
  // purchasedCredits is signed: negative when bought credits were spent
  const fromBought = Math.max(0, -e.purchasedCredits);
  const fromPlan = e.planCredits;
  const source = fromPlan > 0 && fromBought > 0 ? "Plan + bought" : fromBought > 0 ? "Bought" : "Plan";
  return { entry: e, amount: fromPlan + fromBought, purchase: false, source };
}

/** "Today, 4:12 pm" · "Yesterday, 9:03 am" · "21 Oct, 3:27 pm" */
function whenLabel(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86_400_000);
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const day =
    diffDays === 0 ? "Today"
    : diffDays === 1 ? "Yesterday"
    : date.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        ...(date.getFullYear() !== now.getFullYear() && { year: "numeric" }),
      });
  return `${day}, ${time}`;
}

function ActivityIcon({ purchase }: { purchase: boolean }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
        purchase ? "bg-success-container text-success" : "bg-surface-container text-on-surface-variant",
      )}
      aria-hidden
    >
      {purchase ? <Plus className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
    </span>
  );
}

function ActivityAmount({ row }: { row: ActivityRow }) {
  return (
    <span className={cn("font-medium tabular-nums", row.purchase ? "text-success" : "text-on-surface")}>
      {row.amount === 0 ? "0" : `${row.purchase ? "+" : "−"}${n(row.amount)}`}
      <span className="sr-only"> credits</span>
    </span>
  );
}

const activityTitle = (row: ActivityRow) =>
  row.purchase ? "Bought credits" : row.entry.label ?? row.entry.action ?? "AI action";

const activityColumns: DataTableColumn<ActivityRow>[] = [
  {
    id: "activity",
    header: "Activity",
    skeleton: "avatar",
    cell: (row) => (
      <span className="flex min-w-0 items-center gap-3">
        <ActivityIcon purchase={row.purchase} />
        <span className="truncate text-on-surface">{activityTitle(row)}</span>
      </span>
    ),
  },
  {
    id: "source",
    header: "Source",
    className: "w-40",
    cellClassName: "text-on-surface-variant",
    cell: (row) => row.source ?? "Purchase",
  },
  {
    id: "when",
    header: "When",
    className: "w-48",
    cellClassName: "whitespace-nowrap text-on-surface-variant",
    cell: (row) => <time dateTime={row.entry.createdAt}>{whenLabel(row.entry.createdAt)}</time>,
  },
  {
    id: "credits",
    header: "Credits",
    align: "right",
    className: "w-28",
    skeleton: "short",
    cell: (row) => <ActivityAmount row={row} />,
  },
];

function CreditHistory() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch } = useAiCreditHistory(page);
  const rows = useMemo(() => (data?.entries ?? []).map(toRow), [data]);

  return (
    <section aria-labelledby="credit-history-heading" className={cn(billingCard, "overflow-hidden")}>
      <h2 id="credit-history-heading" className="px-6 pt-5 pb-3 text-title-sm font-semibold text-on-surface">
        Credit activity
      </h2>
      <DataTable
        label="AI credit activity"
        columns={activityColumns}
        rows={rows}
        rowKey={(row) => row.entry.id}
        rowLabel={(row) => `${activityTitle(row)}, ${whenLabel(row.entry.createdAt)}`}
        loading={isLoading}
        skeletonRows={5}
        error={isError}
        onRetry={() => refetch()}
        pagination={{
          page: page - 1,
          pageSize: AI_CREDIT_HISTORY_PAGE_SIZE,
          total: data?.total ?? 0,
          onPageChange: (p) => setPage(p + 1),
        }}
        empty={{
          icon: <Sparkles className="h-10 w-10" />,
          title: "No AI usage yet",
          description: "Credits you use or buy show up here.",
          compact: true,
        }}
        renderMobileRow={(row) => (
          <div className="flex items-center gap-3">
            <ActivityIcon purchase={row.purchase} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-body text-on-surface">{activityTitle(row)}</p>
              <p className="text-caption text-on-surface-variant">
                <time dateTime={row.entry.createdAt}>{whenLabel(row.entry.createdAt)}</time>
                {row.source && <> · from {row.source.toLowerCase()}</>}
              </p>
            </div>
            <ActivityAmount row={row} />
          </div>
        )}
      />
    </section>
  );
}
