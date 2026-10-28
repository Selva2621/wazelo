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
  Repeat,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMobileTitle } from "@/hooks/use-mobile-chrome";
import {
  useCampaign,
  useCampaignAnalytics,
  useCampaignRecipients,
  useExecuteCampaign,
  usePauseCampaign,
  useResumeCampaign,
  useCancelCampaign,
  useRerunCampaign,
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
  usePageTitle("Campaign details");
  // Short title for the compact iOS nav bar
  useMobileTitle("Campaign");
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
  const rerunMut = useRerunCampaign();
  const [confirmRerun, setConfirmRerun] = useState(false);

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
        <p className="text-body-lg text-on-surface-variant">
          Campaign not found.
        </p>
        <Button variant="ghost" onClick={() => router.push("/campaigns")}>
          Back to campaigns
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
      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6 max-lg:space-y-4">
        {/* Back + Header */}
        <div>
          <button
            type="button"
            onClick={() => router.push("/campaigns")}
            className="mb-3 flex items-center gap-1.5 rounded-md text-body text-on-surface-variant outline-none transition-colors hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus max-lg:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
            Campaigns
          </button>

          <div className="flex items-start justify-between gap-4 max-lg:flex-col max-lg:gap-3">
            <div className="min-w-0 max-lg:w-full">
              <div className="flex items-center gap-3 mb-1 max-lg:flex-wrap max-lg:gap-2">
                <h1 className="text-headline font-semibold text-on-surface max-lg:text-title max-lg:break-words">
                  {campaign.name}
                </h1>
                <CampaignStatusBadge
                  status={campaign.status}
                  pulse={isRunning}
                />
                {isRunning && (
                  <span className="flex items-center gap-1 text-caption text-error font-medium">
                    <span className="h-2 w-2 rounded-full bg-error animate-pulse" />
                    Live
                  </span>
                )}
              </div>
              {campaign.description && (
                <p className="text-body text-on-surface-variant mb-2">
                  {campaign.description}
                </p>
              )}
              <div className="flex gap-4 text-label text-on-surface-variant max-lg:flex-col max-lg:gap-0.5">
                <span>Started: {formatDate(campaign.startedAt)}</span>
                <span>Completed: {formatDate(campaign.completedAt)}</span>
                {campaign.scheduledAt && (
                  <span>Scheduled: {formatDate(campaign.scheduledAt)}</span>
                )}
              </div>
            </div>

            {/* Action Buttons (full-width row on mobile) */}
            <div className="flex gap-2 max-lg:w-full max-lg:[&>*]:flex-1">
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
              {isTerminal && (
                <Button onClick={() => setConfirmRerun(true)} loading={rerunMut.isPending}>
                  <Repeat className="h-4 w-4 mr-1" />
                  Run again
                </Button>
              )}
            </div>
            <ConfirmDialog
              open={confirmRerun}
              title="Send this campaign again now?"
              message="WhatsApp messages go out right away to the same audience, including contacts added since. Contacts without a saved name are greeted as “there”. This campaign's report stays as it is."
              confirmLabel="Send now"
              loading={rerunMut.isPending}
              onCancel={() => setConfirmRerun(false)}
              onConfirm={() =>
                rerunMut.mutate(campaignId, {
                  onSuccess: (created) => {
                    setConfirmRerun(false);
                    router.push(`/campaigns/${created.id}`);
                  },
                })
              }
            />
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
          repliedCount={campaign.repliedCount}
        />

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_1.5fr] gap-6 max-lg:grid-cols-1 max-lg:gap-4">
          {/* Left: Campaign Info */}
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 space-y-4">
            <h2 className="text-title-sm font-semibold text-on-surface">
              Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-caption text-on-surface-variant">
                  Message type
                </p>
                <p className="text-body text-on-surface">
                  {campaign.messageType.charAt(0) + campaign.messageType.slice(1).toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
              <div>
                <p className="text-caption text-on-surface-variant">
                  Audience
                </p>
                <p className="text-body text-on-surface">
                  {campaign.audienceType === "ALL"
                    ? "All contacts"
                    : "Filtered"}
                </p>
              </div>
              <div>
                <p className="text-caption text-on-surface-variant">
                  Timezone
                </p>
                <p className="text-body text-on-surface">
                  {campaign.timezone}
                </p>
              </div>
            </div>

            {/* Message Preview */}
            {campaign.messageBody && (
              <div>
                <p className="text-caption text-on-surface-variant mb-2">
                  Message
                </p>
                <div className="rounded-xl bg-surface-container-low p-3">
                  <p className="text-body text-on-surface whitespace-pre-wrap break-words">
                    {campaign.messageBody}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Recipients Table */}
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 max-lg:min-w-0 max-lg:p-4">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-title-sm font-semibold text-on-surface">
                Recipients
              </h2>
              <span className="text-body tabular-nums text-on-surface-variant">
                {campaign.totalRecipients.toLocaleString()}
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
