"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, tabPanelProps } from "@/components/ui/tabs";
import { usePageTitle } from "@/hooks/use-page-title";
import { useSubscription } from "@/hooks/use-billing";
import { useAuthStore } from "@/stores/auth-store";
import { AiCreditsPanel } from "./ai-credits-panel";
import { BillingHistory } from "./billing-history";
import { BillingOverview } from "./billing-overview";
import { BillingPlans } from "./billing-plans";

export type BillingTab = "overview" | "plans" | "ai-credits" | "history";

const TABS: { id: BillingTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "plans", label: "Plans" },
  { id: "ai-credits", label: "AI credits" },
  { id: "history", label: "History" },
];

const BILLING_TABS = new Set<BillingTab>(["overview", "plans", "history"]);

/** URL of each tab: AI credits keeps its own route (sidebar + header link to it). */
function hrefFor(tab: BillingTab): string {
  if (tab === "ai-credits") return "/settings/ai-credits";
  return tab === "overview" ? "/settings/billing" : `/settings/billing?tab=${tab}`;
}

/**
 * Billing and AI credits on one page with tabs. Admins get every tab; other roles
 * only manage AI credits, so they see that panel alone.
 */
export function BillingWorkspace({ route }: { route: "billing" | "ai-credits" }) {
  const router = useRouter();
  const tabParam = useSearchParams().get("tab") as BillingTab | null;
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");

  const active: BillingTab = !isAdmin || route === "ai-credits"
    ? "ai-credits"
    : tabParam && BILLING_TABS.has(tabParam) ? tabParam : "overview";

  usePageTitle(active === "ai-credits" ? "AI credits" : "Billing");

  const { data, isLoading } = useSubscription({ enabled: isAdmin });
  const subscription = data?.subscription ?? null;

  const goTo = (tab: BillingTab) => router.replace(hrefFor(tab), { scroll: false });

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1200px] space-y-6 p-6">
        <div className="space-y-1 max-lg:hidden">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 rounded text-label text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
            Settings
          </Link>
          <PageHeader title={isAdmin ? "Billing" : "AI credits"} />
        </div>

        {isAdmin && (
          <div data-tour="billing-tabs">
            <Tabs
              tabs={TABS}
              activeTab={active}
              onTabChange={(id) => goTo(id as BillingTab)}
              idBase="billing"
              label="Billing sections"
            />
          </div>
        )}

        <div {...(isAdmin ? tabPanelProps("billing", active) : {})} className="rise-in outline-none" key={active}>
          {active === "ai-credits" ? (
            <AiCreditsPanel />
          ) : isLoading ? (
            <div className="flex justify-center py-16" role="status">
              <Spinner size="lg" className="text-primary" />
              <span className="sr-only">Loading billing…</span>
            </div>
          ) : active === "plans" ? (
            <BillingPlans subscription={subscription} />
          ) : active === "history" ? (
            <BillingHistory />
          ) : (
            <BillingOverview subscription={subscription} usage={data?.usage ?? null} onGoTo={goTo} />
          )}
        </div>
      </div>
    </div>
  );
}
