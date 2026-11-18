"use client";

import Link from "next/link";
import { useRevenueSnapshot } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";

function money(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      notation: value >= 100_000 ? "compact" : "standard",
      maximumFractionDigits: value >= 100_000 ? 1 : 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("en-IN")}`;
  }
}

function Tile({
  href,
  label,
  value,
  detail,
  first,
}: {
  href: string;
  label: string;
  value: string;
  detail: string;
  first?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group min-w-0 px-5 py-4 transition-colors hover:bg-surface-container-low max-sm:px-4",
        !first && "border-l border-outline-variant/40 max-lg:[&:nth-child(3)]:border-l-0",
      )}
    >
      <p className="truncate text-label text-on-surface-variant">{label}</p>
      <p className="mt-0.5 truncate text-title font-semibold tabular-nums text-on-surface">{value}</p>
      <p className="truncate text-caption text-on-surface-variant group-hover:text-on-surface">{detail}</p>
    </Link>
  );
}

/** Money at a glance: pipeline value, deals won and proposals (last 7 days) */
export function RevenueStrip() {
  const { data, isLoading } = useRevenueSnapshot();

  if (isLoading) {
    return <div className="h-[86px] animate-pulse rounded-2xl bg-surface-container-lowest" aria-label="Loading revenue" />;
  }
  if (!data) return null;

  const viewedPct = data.proposalsSent ? Math.round((data.proposalsViewed / data.proposalsSent) * 100) : 0;

  return (
    <section
      data-tour="dash-revenue"
      aria-label="Revenue and deals"
      className="grid grid-cols-4 overflow-hidden rounded-2xl border border-outline-variant/15 bg-surface-container-lowest max-lg:grid-cols-2 max-lg:[&>*:nth-child(n+3)]:border-t"
    >
      <Tile
        first
        href="/deals"
        label="Pipeline"
        value={money(data.pipelineValue, data.currency)}
        detail={`${data.openDeals} open ${data.openDeals === 1 ? "deal" : "deals"}${data.mixedCurrencies ? ` · ${data.currency} only` : ""}`}
      />
      <Tile
        href="/deals"
        label="Won · 7 days"
        value={money(data.wonValue, data.currency)}
        detail={`${data.wonCount} ${data.wonCount === 1 ? "deal" : "deals"} closed`}
      />
      <Tile
        href="/proposals"
        label="Proposals · 7 days"
        value={String(data.proposalsSent)}
        detail="sent to clients"
      />
      <Tile
        href="/proposals"
        label="Viewed"
        value={String(data.proposalsViewed)}
        detail={data.proposalsSent ? `${viewedPct}% opened` : "none sent yet"}
      />
    </section>
  );
}
