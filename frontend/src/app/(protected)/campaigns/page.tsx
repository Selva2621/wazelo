"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Plus, Megaphone, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useCampaignSocket } from "@/hooks/use-campaign-socket";
import { useCampaignsStore } from "@/stores/campaigns-store";
import { useWhatsAppSession, useAdminSessions } from "@/hooks/use-whatsapp";
import { useAuthStore } from "@/stores/auth-store";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { FilterBar, FilterBarDivider, FilterSelect } from "@/components/ui/filter-bar";
import { PageHeader } from "@/components/layout/page-header";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { CreateCampaignModal } from "@/components/campaigns/create-campaign-modal";
import { useSubscription } from "@/hooks/use-billing";
import { LoadError } from "@/components/ui/empty-state";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import type { CampaignStatus, ListCampaignsParams, MessageType, CampaignAudienceType } from "@/lib/types/campaigns";
import type { CreateCampaignFormData } from "@/lib/validations/campaigns";

type AudienceFilters = NonNullable<CreateCampaignFormData["audienceFilters"]>;

const TAKE = 20;

// ─── Date range helper ────────────────────────────────────────────────────────
function getDateRangeCutoff(range: "" | "this_week" | "this_month" | "last_30"): Date | null {
  if (!range) return null;
  const now = new Date();
  if (range === "last_30") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (range === "this_month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "this_week") {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return null;
}

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
  const [initialAudience, setInitialAudience] = useState<AudienceFilters | undefined>();

  // "New Campaign" shortcuts land here with ?action=new — open the create
  // form, then drop the params so a refresh doesn't reopen it. Contact
  // source groups also pass ?source= or ?scrapeRunId= to target that group.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("action") !== "new") return;
    const source = url.searchParams.get("source");
    const scrapeRunId = url.searchParams.get("scrapeRunId");
    for (const key of ["action", "source", "scrapeRunId"]) url.searchParams.delete(key);
    window.history.replaceState(null, "", url.pathname + url.search);
    const frame = requestAnimationFrame(() => {
      if (scrapeRunId) setInitialAudience({ scrapeRunId });
      else if (source) setInitialAudience({ sources: [source] });
      setShowCreate(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const { page, setPage } = useCampaignsStore();

  const [filterSearch, setFilterSearch]             = useState("");
  const [filterMessageType, setFilterMessageType]   = useState<MessageType | "">("");
  const [filterAudienceType, setFilterAudienceType] = useState<CampaignAudienceType | "">("");
  const [filterDateRange, setFilterDateRange]       = useState<"" | "this_week" | "this_month" | "last_30">("");
  const [sortBy, setSortBy]                         = useState<"createdAt" | "scheduledAt">("createdAt");
  const [sortOrder, setSortOrder]                   = useState<"asc" | "desc">("desc");

  const userRole = useAuthStore((s) => s.user?.role);
  const { data: session } = useWhatsAppSession();
  const { data: adminSessionsData } = useAdminSessions();

  const effectiveStatus: CampaignStatus | undefined =
    statusTab !== "ALL" ? (statusTab as CampaignStatus) : undefined;

  const params = useMemo<ListCampaignsParams>(
    () => ({ page: page + 1, limit: TAKE, status: effectiveStatus, sortBy, sortOrder }),
    [page, effectiveStatus, sortBy, sortOrder],
  );

  const { data, isLoading, isError, refetch } = useCampaigns(params);

  // ─── Client-side filtering ────────────────────────────────────────────────
  const filteredCampaigns = useMemo(() => {
    let list = data?.data ?? [];
    if (filterSearch.trim()) {
      const q = filterSearch.toLowerCase();
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description?.toLowerCase().includes(q) ?? false),
      );
    }
    if (filterMessageType)  list = list.filter((c) => c.messageType === filterMessageType);
    if (filterAudienceType) list = list.filter((c) => c.audienceType === filterAudienceType);
    const cutoff = getDateRangeCutoff(filterDateRange);
    if (cutoff) list = list.filter((c) => new Date(c.createdAt) >= cutoff!);
    return list;
  }, [data, filterSearch, filterMessageType, filterAudienceType, filterDateRange]);

  const activeFilterCount = [
    filterSearch !== "",
    filterMessageType !== "",
    filterAudienceType !== "",
    filterDateRange !== "",
  ].filter(Boolean).length;

  function handleClearFilters() {
    setFilterSearch("");
    setFilterMessageType("");
    setFilterAudienceType("");
    setFilterDateRange("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(0);
  }

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
    return session
      ? [{ id: session.id, name: session.phoneNumber || "WhatsApp Session", status: session.status }]
      : [];
  }, [userRole, adminSessionsData, session]);

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Upgrade banner */}
      {!campaignsEnabled && (
        <div className="shrink-0 mx-6 mt-4 max-lg:mx-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-container px-4 py-3 text-body text-warning">
          <Megaphone className="h-4 w-4 shrink-0 text-warning" />
          <span>
            <strong>Campaigns</strong> are not included in your current plan.{" "}
            <Link href="/settings/billing" className="underline font-medium hover:text-on-surface">
              Upgrade to Growth or higher
            </Link>{" "}
            to unlock this feature.
          </span>
        </div>
      )}

      <MobilePageActions primary={{ label: "New campaign", onClick: () => setShowCreate(true) }} />

      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4 max-lg:px-4 max-lg:pt-2 max-lg:space-y-3">
        {/* Phones/tablets: the iOS nav bar shows the title and "+" */}
        <SearchInput
          value={filterSearch}
          onChange={(e) => setFilterSearch(e.target.value)}
          placeholder="Search campaigns"
          className="w-full lg:hidden"
        />
        <PageHeader
          className="max-lg:hidden"
          title="Campaigns"
          count={data?.total}
          actions={
            <>
              <SearchInput
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                placeholder="Search campaigns"
                className="w-64"
              />
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-1 h-4 w-4" />
                New campaign
              </Button>
            </>
          }
        />

        {/* Every filter on one row: status, then type / audience / date / sort */}
        <FilterBar className="mobile-scroll-x">
          <Tabs tabs={tabsWithCounts} activeTab={statusTab} onTabChange={handleStatusTabChange} />
          <FilterBarDivider />
          <FilterSelect
            label="Message type"
            active={filterMessageType !== ""}
            value={filterMessageType}
            onChange={(e) => { setFilterMessageType(e.target.value as MessageType | ""); setPage(0); }}
          >
            <option value="">All types</option>
            <option value="TEXT">Text</option>
            <option value="IMAGE">Image</option>
            <option value="VIDEO">Video</option>
            <option value="DOCUMENT">Document</option>
            <option value="AUDIO">Audio</option>
          </FilterSelect>
          <FilterSelect
            label="Audience"
            active={filterAudienceType !== ""}
            value={filterAudienceType}
            onChange={(e) => { setFilterAudienceType(e.target.value as CampaignAudienceType | ""); setPage(0); }}
          >
            <option value="">All audiences</option>
            <option value="ALL">All contacts</option>
            <option value="FILTERED">Filtered segment</option>
          </FilterSelect>
          <FilterSelect
            label="Created"
            active={filterDateRange !== ""}
            value={filterDateRange}
            onChange={(e) => { setFilterDateRange(e.target.value as typeof filterDateRange); setPage(0); }}
          >
            <option value="">Any date</option>
            <option value="this_week">This week</option>
            <option value="this_month">This month</option>
            <option value="last_30">Last 30 days</option>
          </FilterSelect>
          <FilterSelect
            label="Sort"
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split(":") as [typeof sortBy, typeof sortOrder];
              setSortBy(by); setSortOrder(order); setPage(0);
            }}
          >
            <option value="createdAt:desc">Newest first</option>
            <option value="createdAt:asc">Oldest first</option>
            <option value="scheduledAt:asc">Scheduled (soonest)</option>
            <option value="scheduledAt:desc">Scheduled (latest)</option>
          </FilterSelect>
          {activeFilterCount > 0 && (
            <>
              <span className="shrink-0 text-label tabular-nums text-on-surface-variant">
                {filteredCampaigns.length} of {data?.data?.length ?? 0}
              </span>
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="shrink-0">
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            </>
          )}
        </FilterBar>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isError ? (
          <LoadError what="campaigns" onRetry={() => refetch()} className="m-6" />
        ) : (
        <CampaignsTable
          campaigns={filteredCampaigns}
          total={data?.total ?? 0}
          take={TAKE}
          skip={page * TAKE}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          onPageChange={setPage}
          onCreateClick={() => setShowCreate(true)}
        />
        )}
      </div>

      {/* Create Modal */}
      <CreateCampaignModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setInitialAudience(undefined); }}
        sessions={sessions}
        initialAudienceFilters={initialAudience}
      />
    </div>
  );
}
