"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { useSubscription } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { daysUntil, formatBillingDate } from "./billing-format";

/**
 * App-wide, admins only: a paid plan ending within 3 days. Plans are never charged
 * automatically, so the admin has to pay (Billing → Renew now) before it ends.
 * Hidden once the next period is paid.
 */
export function RenewalBanner() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const pathname = usePathname();
  // Same cached query the layout's subscription gate uses
  const { data } = useSubscription({ enabled: isAdmin });
  const sub = data?.subscription;

  if (!isAdmin || !sub || pathname.startsWith("/settings/billing")) return null;
  if (sub.status !== "ACTIVE" || sub.cancelledAt || sub.nextPeriodPaid || sub.plan.priceInCents <= 0) return null;
  const daysLeft = daysUntil(sub.currentPeriodEnd);
  if (daysLeft > 3) return null;

  return (
    <div className="px-4 pt-3" role="region" aria-label="Plan renewal">
      <div
        role="status"
        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warning/40 bg-warning-container px-4 py-3 text-on-surface"
      >
        <AlertTriangle className="h-4.5 w-4.5 shrink-0 text-warning" aria-hidden />
        <p className="min-w-0 flex-1 text-body">
          Your {sub.plan.name} plan ends on{" "}
          <span className="font-medium">{formatBillingDate(sub.currentPeriodEnd)}</span>. It isn&apos;t charged automatically.
        </p>
        <Link
          href="/settings/billing"
          className="rounded text-body font-medium text-on-surface underline outline-none hover:no-underline focus-visible:ring-2 focus-visible:ring-focus"
        >
          Renew now
        </Link>
      </div>
    </div>
  );
}
