"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Info,
  Play,
  Pause,
  X as XIcon,
  RotateCcw,
  Repeat,
  Timer,
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
import { ChannelIcon } from "@/components/campaigns/email-channel";
import type {
  CampaignBatchProgress,
  CampaignRecipientStatus,
  ListRecipientsParams,
} from "@/lib/types/campaigns";

const RECIPIENT_TAKE = 20;
const BULK_SEND_START_HOUR = 0;
const BULK_SEND_END_HOUR = 22;

const RECIPIENT_TABS = [
  { id: "ALL", label: "All" },
  { id: "SENT", label: "Sent" },
  { id: "DELIVERED", label: "Delivered" },
  { id: "FAILED", label: "Failed" },
  { id: "SKIPPED", label: "Skipped" },
];

function getLocalDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
  };
}

function getNextSendWindowOpen(date: Date, timeZone: string): Date | null | undefined {
  try {
    const local = getLocalDateParts(date, timeZone);
    if (local.hour >= BULK_SEND_START_HOUR && local.hour < BULK_SEND_END_HOUR) {
      return null;
    }

    const targetDay =
      local.hour >= BULK_SEND_END_HOUR
        ? new Date(Date.UTC(local.year, local.month - 1, local.day + 1))
        : new Date(Date.UTC(local.year, local.month - 1, local.day));
    const targetLocalTime = Date.UTC(
      targetDay.getUTCFullYear(),
      targetDay.getUTCMonth(),
      targetDay.getUTCDate(),
      BULK_SEND_START_HOUR,
    );
    let candidate = targetLocalTime;

    for (let attempt = 0; attempt < 3; attempt++) {
      const candidateLocal = getLocalDateParts(new Date(candidate), timeZone);
      const candidateLocalTime = Date.UTC(
        candidateLocal.year,
        candidateLocal.month - 1,
        candidateLocal.day,
        candidateLocal.hour,
      );
      candidate += targetLocalTime - candidateLocalTime;
    }

    return new Date(candidate);
  } catch {
    return undefined;
  }
}

function formatInTimeZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone,
    }).format(date);
  } catch {
    return null;
  }
}

function formatElapsedTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function batchTotal(batch: CampaignBatchProgress) {
  return Object.values(batch.counts).reduce((total, count) => total + count, 0);
}

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
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

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
  const isWhatsAppCampaign = campaign.channel !== "EMAIL";
  const isTerminal = ["COMPLETED", "FAILED", "CANCELLED"].includes(
    campaign.status,
  );
  const timingReference =
    campaign.status === "SCHEDULED" && campaign.scheduledAt
      ? new Date(campaign.scheduledAt)
      : new Date(now);
  const nextSendWindowOpen = isWhatsAppCampaign
    ? getNextSendWindowOpen(timingReference, campaign.timezone)
    : null;
  const elapsedMs = analytics
    ? analytics.timing.elapsedMs +
      (isRunning ? Math.max(0, now - new Date(analytics.timing.asOf).getTime()) : 0)
    : 0;

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
              {campaign.startedAt && (
                <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-surface-container-low px-3 py-1.5 text-label text-on-surface">
                  <Timer className="h-4 w-4 text-primary" />
                  <span>{isRunning ? "Elapsed" : "Run time"}</span>
                  <span className="font-mono font-semibold tabular-nums" aria-live="off">
                    {formatElapsedTime(elapsedMs)}
                  </span>
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

        {isWhatsAppCampaign &&
          (isRunning || campaign.status === "SCHEDULED") && (
            <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-body text-on-surface">
              <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div className="space-y-1">
                <p className="flex items-center gap-2 font-medium">
                  <Clock3 className="h-4 w-4" />
                  WhatsApp delivery timing
                </p>
                <p className="text-on-surface-variant">
                  Campaign messages can be sent from 12:00 AM to 10:00 PM ({campaign.timezone}).
                  {campaign.status === "SCHEDULED" && campaign.scheduledAt && (
                    <> This campaign is scheduled for {formatInTimeZone(new Date(campaign.scheduledAt), campaign.timezone) ?? formatDate(campaign.scheduledAt)}.</>
                  )}
                  {campaign.status === "SCHEDULED"
                    ? nextSendWindowOpen instanceof Date
                      ? ` Because that time is outside sending hours, the next eligible window opens at ${formatInTimeZone(nextSendWindowOpen, campaign.timezone) ?? "the next sending window"}.`
                      : nextSendWindowOpen === null
                        ? " The scheduled time falls within the allowed sending window."
                        : " The next opening time could not be calculated for this timezone."
                    : nextSendWindowOpen instanceof Date
                      ? ` The next eligible sending window opens at ${formatInTimeZone(nextSendWindowOpen, campaign.timezone) ?? "the next sending window"}.`
                      : nextSendWindowOpen === null
                        ? " The sending window is open."
                        : " The next opening time could not be calculated for this timezone."}
                </p>
                <p className="text-caption text-on-surface-variant">
                  This is the earliest allowed window, not a guaranteed send time.
                  Per-number daily limits, warm-up rules, contact limits, or pacing can delay delivery.
                  A Running campaign may still have recipients waiting.
                </p>
              </div>
            </div>
          )}

        {isWhatsAppCampaign && (analytics?.batches.length ?? 0) > 0 && (
          <section className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5 max-lg:p-4">
            <div className="mb-4">
              <h2 className="text-title-sm font-semibold text-on-surface">
                Batch and WhatsApp session status
              </h2>
              <p className="mt-1 text-caption text-on-surface-variant">
                Sent totals include messages that are already delivered.
              </p>
            </div>
            <div className="space-y-3">
              {analytics!.batches.map((batch) => {
                const total = batchTotal(batch);
                const sent = batch.counts.sent + batch.counts.delivered;
                const sessionStatus = batch.sessionStatus?.toLowerCase() ?? "unavailable";
                return (
                  <div
                    key={`${batch.batchNumber}-${batch.sessionId ?? "unassigned"}`}
                    className="rounded-xl border border-outline-variant p-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-body font-medium text-on-surface">
                          Batch {batch.batchNumber}
                        </p>
                        <p className="mt-1 text-caption text-on-surface-variant">
                          {batch.sessionPhoneNumber || "WhatsApp sender unavailable"}
                          {" · "}
                          Session {sessionStatus}
                        </p>
                      </div>
                      <p className="text-body font-semibold tabular-nums text-on-surface">
                        Sent {sent} / {total}
                      </p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-caption text-on-surface-variant">
                      <span>Queued {batch.counts.queued}</span>
                      <span>Pending {batch.counts.pending}</span>
                      <span>Failed {batch.counts.failed}</span>
                      <span>Skipped {batch.counts.skipped}</span>
                    </div>
                    {batch.issues.length > 0 ? (
                      <ul className="mt-3 space-y-1 border-t border-outline-variant pt-3">
                        {batch.issues.map((issue) => (
                          <li key={issue} className="flex gap-2 text-caption text-error">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 flex items-center gap-2 border-t border-outline-variant pt-3 text-caption text-on-surface-variant">
                        <CheckCircle2 className="h-4 w-4 text-success" />
                        No session or recipient issues reported.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
        <div data-tour="campaign-analytics">
          <CampaignAnalyticsCards
            totalRecipients={campaign.totalRecipients}
            sentCount={campaign.sentCount}
            deliveredCount={campaign.deliveredCount}
            readCount={campaign.readCount}
            failedCount={campaign.failedCount}
            repliedCount={campaign.repliedCount}
          />
        </div>
        {campaign.status === "COMPLETED" && campaign.failedCount > 0 && (
          <p className="rounded-xl border border-error/20 bg-error/5 px-4 py-3 text-body text-on-surface-variant">
            Campaign processing is complete, but {campaign.failedCount} recipient
            {campaign.failedCount === 1 ? "" : "s"} failed. Check each failed
            recipient below for the reason.
          </p>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-[1fr_1.5fr] gap-6 max-lg:grid-cols-1 max-lg:gap-4">
          {/* Left: Campaign Info */}
          <div data-tour="campaign-details" className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 space-y-4">
            <h2 className="text-title-sm font-semibold text-on-surface">
              Details
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-caption text-on-surface-variant">
                  Channel
                </p>
                <p className="flex items-center gap-1.5 text-body text-on-surface">
                  <ChannelIcon channel={campaign.channel} />
                  {campaign.channel === "EMAIL" ? "Email" : "WhatsApp"}
                </p>
              </div>
              {campaign.channel === "EMAIL" ? (
                campaign.emailSubject && (
                  <div>
                    <p className="text-caption text-on-surface-variant">
                      Subject
                    </p>
                    <p className="text-body text-on-surface break-words">{campaign.emailSubject}</p>
                  </div>
                )
              ) : (
              <div>
                <p className="text-caption text-on-surface-variant">
                  Message type
                </p>
                <p className="text-body text-on-surface">
                  {campaign.messageType.charAt(0) + campaign.messageType.slice(1).toLowerCase().replace(/_/g, " ")}
                </p>
              </div>
              )}
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
          <div data-tour="campaign-recipients" className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-5 max-lg:min-w-0 max-lg:p-4">
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
