"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  X as XIcon,
  RotateCcw,
  Copy,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useCampaign,
  useCampaignAnalytics,
  useCampaignRecipients,
  useExecuteCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useCancelCampaign,
} from "@/hooks/use-campaigns";
import { useCampaignSocket } from "@/hooks/use-campaign-socket";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs } from "@/components/ui/tabs";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { CampaignAnalyticsCards } from "@/components/campaigns/campaign-analytics-cards";
import { CampaignProgressRing } from "@/components/campaigns/campaign-progress-ring";
import { CampaignRecipientsTable } from "@/components/campaigns/campaign-recipients-table";
import type {
  CampaignRecipientStatus,
  ListRecipientsParams,
} from "@/lib/types/campaigns";

const RECIPIENT_TAKE = 20;

const RECIPIENT_TABS = [
  { id: "ALL", label: "All" },
  { id: "SENT", label: "Sent" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "FAILED", label: "Failed" },
  { id: "SKIPPED", label: "Skipped" },
];

export default function CampaignDetailPage() {
  usePageTitle("Campaign Details");
  useCampaignSocket();

  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [recipientTab, setRecipientTab] = useState("ALL");
  const [recipientPage, setRecipientPage] = useState(0);

  const { data: campaign, isLoading } = useCampaign(campaignId);
  const { data: analytics } = useCampaignAnalytics(campaignId);

  const recipientStatus: CampaignRecipientStatus | undefined =
    recipientTab !== "ALL"
      ? (recipientTab as CampaignRecipientStatus)
      : undefined;

  const recipientParams: ListRecipientsParams = {
    page: recipientPage + 1,
    limit: RECIPIENT_TAKE,
    status: recipientStatus,
  };

  const { data: recipientsData, isLoading: recipientsLoading } =
    useCampaignRecipients(campaignId, recipientParams);

  const executeMut = useExecuteCampaign();
  const pauseMut = usePauseCampaign();
  const resumeMut = useResumeCampaign();
  const cancelMut = useCancelCampaign();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-var(--header-height))]">
        <Spinner />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-var(--header-height))] gap-3">
        <p className="text-[14px] text-on-surface-variant">
          Campaign not found.
        </p>
        <Button variant="ghost" onClick={() => router.push("/campaigns")}>
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const isRunning = campaign.status === "RUNNING";
  const isDraft = campaign.status === "DRAFT";
  const isPaused = campaign.status === "PAUSED";
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(
    campaign.status,
  );

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  }

  function handleRecipientTabChange(tabId: string) {
    setRecipientTab(tabId);
    setRecipientPage(0);
  }

  return (
    <div className="h-[calc(100vh-var(--header-height))] overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Back + Header */}
        <div>
          <button
            onClick={() => router.push("/campaigns")}
            className="flex items-center gap-1.5 text-[13px] text-on-surface-variant hover:text-on-surface transition-colors mb-3"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Campaigns
          </button>

          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[22px] font-semibold text-on-surface">
                  {campaign.name}
                </h1>
                <CampaignStatusBadge
                  status={campaign.status}
                  pulse={isRunning}
                />
                {isRunning && (
                  <span className="flex items-center gap-1 text-[11px] text-error font-medium">
                    <span className="h-2 w-2 rounded-full bg-error animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              {campaign.description && (
                <p className="text-[13px] text-on-surface-variant/70 mb-2">
                  {campaign.description}
                </p>
              )}
              <div className="flex gap-4 text-[12px] text-on-surface-variant/60">
                <span>Started: {formatDate(campaign.startedAt)}</span>
                <span>Completed: {formatDate(campaign.completedAt)}</span>
                {campaign.scheduledAt && (
                  <span>Scheduled: {formatDate(campaign.scheduledAt)}</span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              {isDraft && (
                <Button
                  onClick={() => executeMut.mutate(campaignId)}
                  loading={executeMut.isPending}
                >
                  <Play className="h-4 w-4 mr-1" />
                  Execute
                </Button>
              )}
              {isRunning && (
                <Button
                  variant="secondary"
                  onClick={() => pauseMut.mutate(campaignId)}
                  loading={pauseMut.isPending}
                >
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </Button>
              )}
              {isPaused && (
                <Button
                  onClick={() => resumeMut.mutate(campaignId)}
                  loading={resumeMut.isPending}
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Resume
                </Button>
              )}
              {!isTerminal && (
                <Button
                  variant="destructive"
                  onClick={() => cancelMut.mutate(campaignId)}
                  loading={cancelMut.isPending}
                >
                  <XIcon className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Progress Ring (for running/paused campaigns) */}
        {(isRunning || isPaused) && (
          <div className="flex justify-center py-4">
            <CampaignProgressRing
              sent={campaign.sentCount + campaign.failedCount}
              total={campaign.totalRecipients}
              size={180}
            />
          </div>
        )}

        {/* Analytics Cards */}
        <CampaignAnalyticsCards
          totalRecipients={campaign.totalRecipients}
          sentCount={campaign.sentCount}
          deliveredCount={campaign.deliveredCount}
          readCount={campaign.readCount}
          failedCount={campaign.failedCount}
        />

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_1.5fr] gap-6">
          {/* Left: Campaign Info */}
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5 space-y-4">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
              Campaign Details
            </p>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-on-surface-variant/60">
                  Message Type
                </p>
                <p className="text-[13px] text-on-surface">
                  {campaign.messageType}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant/60">
                  Audience
                </p>
                <p className="text-[13px] text-on-surface">
                  {campaign.audienceType === "ALL"
                    ? "All Contacts"
                    : "Filtered"}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-on-surface-variant/60">
                  Timezone
                </p>
                <p className="text-[13px] text-on-surface">
                  {campaign.timezone}
                </p>
              </div>
            </div>

            {/* Message Preview */}
            {campaign.messageBody && (
              <div>
                <p className="text-[11px] text-on-surface-variant/60 mb-2">
                  Message Preview
                </p>
                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-primary-container/10 border border-primary/10 p-3">
                  <p className="text-[13px] text-on-surface whitespace-pre-wrap break-words">
                    {campaign.messageBody}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Recipients Table */}
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
                Recipients
              </p>
              <span className="text-[12px] text-on-surface-variant/60">
                {campaign.totalRecipients.toLocaleString()} total
              </span>
            </div>

            <Tabs
              tabs={RECIPIENT_TABS}
              activeTab={recipientTab}
              onTabChange={handleRecipientTabChange}
            />

            <div className="mt-2">
              <CampaignRecipientsTable
                recipients={recipientsData?.data ?? []}
                total={recipientsData?.total ?? 0}
                take={RECIPIENT_TAKE}
                skip={recipientPage * RECIPIENT_TAKE}
                isLoading={recipientsLoading}
                onPageChange={setRecipientPage}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
