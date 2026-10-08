"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Plus, Megaphone, ChevronDown, X, Filter } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePageTitle } from "@/hooks/use-page-title";
import { useCampaigns } from "@/hooks/use-campaigns";
import { useCampaignSocket } from "@/hooks/use-campaign-socket";
import { useCampaignsStore } from "@/stores/campaigns-store";
import { useWhatsAppSession, useAdminSessions } from "@/hooks/use-whatsapp";
import { useAuthStore } from "@/stores/auth-store";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CampaignsTable } from "@/components/campaigns/campaigns-table";
import { CreateCampaignModal } from "@/components/campaigns/create-campaign-modal";
import { useSubscription } from "@/hooks/use-billing";
import type { CampaignStatus, ListCampaignsParams, MessageType, CampaignAudienceType } from "@/lib/types/campaigns";

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

// ─── Filter select (matches lead scraper [runId] page pattern) ────────────────
function CampaignFilterSelect({
  value, onChange, options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none text-label bg-surface-container border border-outline-variant rounded-lg pl-3 pr-7 py-1.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant" />
    </div>
  );
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

  const { data, isLoading } = useCampaigns(params);

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
        <div className="shrink-0 mx-6 mt-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-container px-4 py-3 text-body text-warning">
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

      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Megaphone className="h-5 w-5 text-on-surface-variant" />
            <h1 className="text-title font-semibold text-on-surface">Campaigns</h1>
            {data && (
              <span className="text-body text-on-surface-variant/60">{data.total} total</span>
            )}
          </div>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-1" />
            New Campaign
          </Button>
        </div>

        {/* ─── Filter bar (lead scraper style) ──────────────────────────── */}
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-4 space-y-3">
          {/* Top row: label + search + count + clear */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-label font-medium text-on-surface-variant">
              <Filter className="w-3.5 h-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary text-on-primary text-caption font-semibold w-4 h-4 rounded-full flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </div>

            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Search campaigns…"
              className="flex-1 min-w-[180px] text-label bg-surface-container border border-outline-variant rounded-lg px-3 py-1.5 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary"
            />

            <span className="text-label text-on-surface-variant ml-auto shrink-0">
              {filteredCampaigns.length} of {data?.data?.length ?? 0}
            </span>

            {activeFilterCount > 0 && (
              <button
                onClick={handleClearFilters}
                className="flex items-center gap-1 text-label text-error hover:underline shrink-0"
              >
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>

          {/* Filter chip row */}
          <div className="flex items-center gap-2 flex-wrap">
            <CampaignFilterSelect
              value={filterMessageType}
              onChange={(v) => { setFilterMessageType(v as MessageType | ""); setPage(0); }}
              options={[
                { value: "", label: "Type: All" },
                { value: "TEXT", label: "Text" },
                { value: "IMAGE", label: "Image" },
                { value: "VIDEO", label: "Video" },
                { value: "DOCUMENT", label: "Document" },
                { value: "AUDIO", label: "Audio" },
              ]}
            />

            <CampaignFilterSelect
              value={filterAudienceType}
              onChange={(v) => { setFilterAudienceType(v as CampaignAudienceType | ""); setPage(0); }}
              options={[
                { value: "", label: "Audience: All" },
                { value: "ALL", label: "All Contacts" },
                { value: "FILTERED", label: "Filtered Segment" },
              ]}
            />

            <CampaignFilterSelect
              value={filterDateRange}
              onChange={(v) => { setFilterDateRange(v as typeof filterDateRange); setPage(0); }}
              options={[
                { value: "", label: "Date: All" },
                { value: "this_week", label: "This Week" },
                { value: "this_month", label: "This Month" },
                { value: "last_30", label: "Last 30 Days" },
              ]}
            />

            <CampaignFilterSelect
              value={`${sortBy}:${sortOrder}`}
              onChange={(v) => {
                const [by, order] = v.split(":") as [typeof sortBy, typeof sortOrder];
                setSortBy(by); setSortOrder(order); setPage(0);
              }}
              options={[
                { value: "createdAt:desc", label: "Newest First" },
                { value: "createdAt:asc",  label: "Oldest First" },
                { value: "scheduledAt:asc",  label: "Scheduled (soonest)" },
                { value: "scheduledAt:desc", label: "Scheduled (latest)" },
              ]}
            />
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
          campaigns={filteredCampaigns}
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
