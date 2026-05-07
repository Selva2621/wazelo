"use client";

import { useState, useMemo } from "react";
import { Plus, Megaphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useCampaignSocket } from "@/hooks/use-campaign-socket";
import { useCampaignsStore } from "@/stores/campaigns-store";
import { useWhatsAppSession, useAdminSessions } from "@/hooks/use-whatsapp";
import { useAuthStore } from "@/stores/auth-store";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { CreateCampaignModal } from "@/components/campaigns/create-campaign-modal";
import { useSubscription } from "@/hooks/use-billing";
import type { CampaignStatus, ListCampaignsParams } from "@/lib/types/campaigns";

const TAKE = 20;

const STATUS_TABS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SCHEDULED", label: "Scheduled" },
  { id: "RUNNING", label: "Running" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETED", label: "Completed" },
  { id: "FAILED", label: "Failed" },
];

export default function CampaignsPage() {
  usePageTitle("Campaigns");
  useCampaignSocket();
  const { data: subData } = useSubscription();
  const campaignsEnabled = subData?.subscription?.plan?.campaignsEnabled ?? true;

  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [statusTab, setStatusTab] = useState("ALL");

  const { searchQuery, page, setSearchQuery, setPage } = useCampaignsStore();
  const userRole = useAuthStore((s) => s.user?.role);
  const { data: session } = useWhatsAppSession();
  const { data: adminSessionsData } = useAdminSessions();

  const effectiveStatus: CampaignStatus | undefined =
    statusTab !== "ALL" ? (statusTab as CampaignStatus) : undefined;

  const params = useMemo<ListCampaignsParams>(
    () => ({
      page: page + 1,
      limit: TAKE,
      status: effectiveStatus,
      sortBy: "createdAt",
      sortOrder: "desc",
    }),
    [page, effectiveStatus],
  );

  const { data, isLoading } = useCampaigns(params);

  const tabsWithCounts = STATUS_TABS.map((tab) => ({
    ...tab,
    count: tab.id === "ALL" ? data?.total : undefined,
  }));

  function handleStatusTabChange(tabId: string) {
    setStatusTab(tabId);
    setPage(0);
  }

  function handleRowClick(campaignId: string) {
    router.push(`/campaigns/${campaignId}`);
  }

  // Build sessions list for the create modal
  // Admin/Manager: show all org sessions; Employee: show own session only
  const sessions = useMemo(() => {
    if (userRole === "ADMIN" || userRole === "MANAGER") {
      const allSessions = adminSessionsData?.sessions ?? [];
      return allSessions
        .filter((s) => s.status === "CONNECTED")
        .map((s) => ({
          id: s.id,
          name: `${s.phoneNumber || "Unknown"} (${(s as { user?: { firstName?: string; lastName?: string } }).user?.firstName ?? "User"})`,
          status: s.status,
        }));
    }
    // Employee: own session only
    return session
      ? [{ id: session.id, name: session.phoneNumber || "WhatsApp Session", status: session.status }]
      : [];
  }, [userRole, adminSessionsData, session]);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Upgrade banner */}
      {!campaignsEnabled && (
        <div className="shrink-0 mx-6 mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">
          <Megaphone className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Campaigns</strong> are not included in your current plan.{" "}
            <a href="/settings/billing" className="underline font-medium hover:text-amber-900">
              Upgrade to Growth or higher
            </a>{" "}
            to unlock this feature.
          </span>
        </div>
      )}
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-on-surface-variant" />
            <h1 className="text-[18px] font-semibold text-on-surface">
              Campaigns
            </h1>
            {data && (
              <span className="text-[13px] text-on-surface-variant/60">
                {data.total} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search campaigns..."
              className="w-64"
            />
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1" />
              New Campaign
            </Button>
          </div>
        </div>

        {/* Status tabs */}
        <Tabs
          tabs={tabsWithCounts}
          activeTab={statusTab}
          onTabChange={handleStatusTabChange}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <CampaignsTable
          campaigns={data?.data ?? []}
          total={data?.total ?? 0}
          take={TAKE}
          skip={page * TAKE}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onPageChange={setPage}
          onCreateClick={() => setShowCreate(true)}
        />
      </div>

      {/* Create Modal */}
      <CreateCampaignModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        sessions={sessions}
      />
    </div>
  );
}
