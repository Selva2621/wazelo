"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Play,
  Pause,
  X as XIcon,
  RotateCcw,
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
  useRetryFailedRecipients,
} from "@/hooks/use-campaigns";
import { useCampaignSocket } from "@/hooks/use-campaign-socket";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, tabPanelProps } from "@/components/ui/tabs";
import { CampaignStatusBadge } from "@/components/campaigns/campaign-status-badge";
import { CampaignKpiStrip } from "@/components/campaigns/campaign-kpi-strip";
import { CampaignRecipientsTable } from "@/components/campaigns/campaign-recipients-table";
import { ChannelIcon } from "@/components/campaigns/email-channel";
import { CampaignBatchTable } from "@/components/campaigns/campaign-batch-table";
import { CampaignElapsedTimer } from "@/components/campaigns/campaign-elapsed-timer";
import { CampaignSendWindowNote } from "@/components/campaigns/campaign-send-window-note";
import { CampaignSendingStatusPanel } from "@/components/campaigns/campaign-sending-status";
import { CampaignMediaMissing } from "@/components/campaigns/campaign-media-missing";
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
  const [section, setSection] = useState<string | null>(null);
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
  const retryMut = useRetryFailedRecipients();
  const [confirmRetry, setConfirmRetry] = useState(false);

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
  const isWhatsAppCampaign = campaign.channel !== "EMAIL";
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(
    campaign.status,
  );
  // Failed only because WhatsApp was disconnected: these can be sent again
  const retryableFailed = campaign.retryableFailedCount ?? 0;
  const canRetryFailed =
    isWhatsAppCampaign &&
    retryableFailed > 0 &&
    ["COMPLETED", "FAILED", "PAUSED"].includes(campaign.status);
  const batchCount = analytics?.batches.length ?? 0;
  const showBatches = isWhatsAppCampaign && batchCount > 0;
  const sectionTabs = [
    ...(showBatches ? [{ id: "batches", label: "Batches", count: batchCount }] : []),
    { id: "recipients", label: "Recipients", count: campaign.totalRecipients },
    { id: "details", label: "Details" },
  ];
  // Batches first while a WhatsApp campaign is sending; otherwise who got it
  const activeSection =
    section && sectionTabs.some((t) => t.id === section)
      ? section
      : showBatches && !isTerminal
        ? "batches"
        : "recipients";

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
              {/* Only the dates that exist; the full list is under Details */}
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-label text-on-surface-variant">
                {campaign.startedAt ? (
                  <span>Started {formatDate(campaign.startedAt)}</span>
                ) : campaign.scheduledAt ? (
                  <span>Scheduled for {formatDate(campaign.scheduledAt)}</span>
                ) : (
                  <span>Not started</span>
                )}
                {campaign.completedAt && <span>Finished {formatDate(campaign.completedAt)}</span>}
              </div>
              {(campaign.startedAt || (isWhatsAppCampaign && analytics?.sendWindow && !isTerminal)) && (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                  {campaign.startedAt && analytics && (
                    <CampaignElapsedTimer
                      elapsedMs={analytics.timing.elapsedMs}
                      asOf={analytics.timing.asOf}
                      running={isRunning}
                    />
                  )}
                  {/* Sending hours only matter while there is still something to send */}
                  {isWhatsAppCampaign && analytics?.sendWindow && !isTerminal && !isDraft && (
                    <CampaignSendWindowNote
                      window={analytics.sendWindow}
                      reference={
                        campaign.status === "SCHEDULED" && campaign.scheduledAt
                          ? new Date(campaign.scheduledAt)
                          : new Date(analytics.timing.asOf)
                      }
                      scheduled={campaign.status === "SCHEDULED"}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons (full-width row on mobile) */}
            <div data-tour="campaign-actions" className="flex gap-2 max-lg:w-full max-lg:[&>*]:flex-1">
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
              message={`${campaign.channel === "EMAIL" ? "Emails" : "WhatsApp messages"} go out right away to the same audience, including contacts added since. Contacts without a saved name are greeted as “there”. This campaign's report stays as it is.`}
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

        <CampaignKpiStrip
          totalRecipients={campaign.totalRecipients}
          sentCount={campaign.sentCount}
          deliveredCount={campaign.deliveredCount}
          readCount={campaign.readCount}
          failedCount={campaign.failedCount}
          repliedCount={campaign.repliedCount}
          processed={analytics?.progress.processed ?? campaign.sentCount + campaign.failedCount}
          showProgress={isRunning || isPaused}
        />

        {campaign.mediaMissing && !isTerminal && !isDraft && (
          <CampaignMediaMissing
            campaignId={campaignId}
            messageType={campaign.messageType}
            canReplace={isPaused || campaign.status === "SCHEDULED"}
          />
        )}

        {isWhatsAppCampaign && analytics?.sending && (isRunning || isPaused) && (
          <CampaignSendingStatusPanel analytics={analytics} sending={analytics.sending} />
        )}

        {(campaign.status === "COMPLETED" || canRetryFailed) && campaign.failedCount > 0 && (
          <p data-tour="campaign-retry-failed" className="text-label text-on-surface-variant">
            {campaign.status === "COMPLETED" ? "Finished with" : "Has"} {campaign.failedCount} failed recipient
            {campaign.failedCount === 1 ? "" : "s"}.{" "}
            <button
              type="button"
              onClick={() => {
                setSection("recipients");
                handleRecipientTabChange("FAILED");
              }}
              className="rounded font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus"
            >
              See why
            </button>
            {canRetryFailed && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setConfirmRetry(true)}
                  disabled={retryMut.isPending}
                  className="rounded font-medium text-primary underline-offset-2 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50"
                >
                  Retry {retryableFailed}
                </button>
              </>
            )}
          </p>
        )}
        <ConfirmDialog
          open={confirmRetry}
          title={`Send again to ${retryableFailed} recipient${retryableFailed === 1 ? "" : "s"}?`}
          message="These failed because WhatsApp was disconnected, so they never got the message. Failures like a wrong number or a block aren't retried."
          confirmLabel="Send again"
          loading={retryMut.isPending}
          onCancel={() => setConfirmRetry(false)}
          onConfirm={() => retryMut.mutate(campaignId, { onSettled: () => setConfirmRetry(false) })}
        />

        {/* Batches · Recipients · Details */}
        <section data-tour="campaign-sections" className="min-w-0">
          <Tabs
            variant="underline"
            idBase="campaign-section"
            label="Campaign sections"
            tabs={sectionTabs}
            activeTab={activeSection}
            onTabChange={setSection}
          />

          <div className="mt-4" {...tabPanelProps("campaign-section", activeSection)}>
            {activeSection === "batches" && analytics && (
              <CampaignBatchTable batches={analytics.batches} />
            )}

            {activeSection === "recipients" && (
              <div className="space-y-3">
                <Tabs
                  tabs={RECIPIENT_TABS}
                  activeTab={recipientTab}
                  onTabChange={handleRecipientTabChange}
                  label="Filter recipients by status"
                />
                <CampaignRecipientsTable
                  recipients={recipientsData?.data ?? []}
                  total={recipientsData?.total ?? 0}
                  take={RECIPIENT_TAKE}
                  skip={recipientPage * RECIPIENT_TAKE}
                  isLoading={recipientsLoading}
                  onPageChange={setRecipientPage}
                />
              </div>
            )}

            {activeSection === "details" && (
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-6 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 max-lg:grid-cols-1 max-lg:gap-4 max-lg:p-4">
                <dl className="grid grid-cols-2 content-start gap-x-4 gap-y-3">
                  <div>
                    <dt className="text-caption text-on-surface-variant">Channel</dt>
                    <dd className="flex items-center gap-1.5 text-body text-on-surface">
                      <ChannelIcon channel={campaign.channel} />
                      {campaign.channel === "EMAIL" ? "Email" : "WhatsApp"}
                    </dd>
                  </div>
                  {campaign.channel === "EMAIL" ? (
                    <div>
                      <dt className="text-caption text-on-surface-variant">Subject</dt>
                      <dd className="break-words text-body text-on-surface">{campaign.emailSubject || "—"}</dd>
                    </div>
                  ) : (
                    <div>
                      <dt className="text-caption text-on-surface-variant">Message type</dt>
                      <dd className="text-body text-on-surface">
                        {campaign.messageType.charAt(0) + campaign.messageType.slice(1).toLowerCase().replace(/_/g, " ")}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-caption text-on-surface-variant">Audience</dt>
                    <dd className="text-body text-on-surface">
                      {campaign.audienceType === "ALL" ? "All contacts" : "Filtered"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-caption text-on-surface-variant">Time zone</dt>
                    <dd className="text-body text-on-surface">{campaign.timezone}</dd>
                  </div>
                  {campaign.scheduledAt && (
                    <div>
                      <dt className="text-caption text-on-surface-variant">Scheduled</dt>
                      <dd className="text-body text-on-surface">{formatDate(campaign.scheduledAt)}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-caption text-on-surface-variant">Completed</dt>
                    <dd className="text-body text-on-surface">{formatDate(campaign.completedAt)}</dd>
                  </div>
                </dl>
                <div className="min-w-0">
                  <p className="mb-2 text-caption text-on-surface-variant">Message</p>
                  <p className="whitespace-pre-wrap break-words rounded-xl bg-surface-container-low p-3 text-body text-on-surface">
                    {campaign.messageBody || "—"}
                  </p>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
