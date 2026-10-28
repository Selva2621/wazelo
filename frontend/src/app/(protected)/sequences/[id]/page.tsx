"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, GitBranch, Pause, Pencil, Play, RotateCcw, StopCircle, Trash2 } from "lucide-react";
import { SequenceEditor } from "@/components/sequences/sequence-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LoadError } from "@/components/ui/empty-state";
import { SequenceAnalytics } from "@/components/sequences/sequence-analytics";
import {
  useSequence,
  useStartSequence,
  usePauseSequence,
  useResumeSequence,
  useCancelSequence,
  useDeleteSequence,
} from "@/hooks/use-sequences";
import { usePipelines } from "@/hooks/use-deals";
import { usePageTitle } from "@/hooks/use-page-title";
import { useMobileTitle } from "@/hooks/use-mobile-chrome";
import type { CampaignSequence, SequenceStatus } from "@/lib/types/sequences";

const STATUS: Record<SequenceStatus, { label: string; variant: "muted" | "success" | "warning" | "info" | "error" }> = {
  DRAFT: { label: "Draft", variant: "muted" },
  ACTIVE: { label: "Active", variant: "success" },
  PAUSED: { label: "Paused", variant: "warning" },
  COMPLETED: { label: "Completed", variant: "info" },
  CANCELLED: { label: "Cancelled", variant: "error" },
};

const LEAD_STATUS_LABEL: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  CONVERTED: "Converted",
  CLOSED: "Closed",
};

const CARD = "rounded-2xl border border-outline-variant bg-surface-container-lowest";

function formatDelay(minutes: number): string {
  if (minutes <= 0) return "Right away";
  if (minutes % 1440 === 0) return minutes === 1440 ? "1 day" : `${minutes / 1440} days`;
  if (minutes % 60 === 0) return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
  return `${minutes} min`;
}

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—";

/** One row of the Details panel: a term and its value. */
function Detail({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-label text-on-surface-variant">{term}</dt>
      <dd className="min-w-0 text-right text-body text-on-surface">{children}</dd>
    </div>
  );
}

export default function SequenceDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: seq, isLoading, isError, refetch } = useSequence(id);
  const { data: pipelines } = usePipelines();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);

  const start = useStartSequence();
  const pause = usePauseSequence();
  const resume = useResumeSequence();
  const cancel = useCancelSequence();
  const remove = useDeleteSequence();

  usePageTitle(seq?.name ?? "Sequence");
  useMobileTitle(seq?.name);

  if (isError) {
    return (
      <div className="p-6">
        <LoadError what="this sequence" onRetry={() => refetch()} />
      </div>
    );
  }

  if (isLoading || !seq) {
    return (
      <div aria-busy="true" aria-label="Loading sequence" className="space-y-4 lg:p-6 max-lg:px-4">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-container" />
        <div className="h-7 w-72 animate-pulse rounded bg-surface-container" />
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${CARD} h-80 animate-pulse`} />
          <div className={`${CARD} h-60 animate-pulse`} />
        </div>
      </div>
    );
  }

  const status = STATUS[seq.status];
  const busy = start.isPending || pause.isPending || resume.isPending || cancel.isPending;
  const steps = [...seq.steps].sort((a, b) => a.stepOrder - b.stepOrder);

  return (
    <div className="space-y-6 lg:p-6 max-lg:px-4 max-lg:pt-2">
      {/* Header: back, name + status, the actions that apply right now */}
      <div className="space-y-2">
        <Link
          href="/sequences"
          className="inline-flex items-center gap-1 rounded-md text-label font-medium text-on-surface-variant outline-none transition-colors hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden /> Sequences
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="truncate text-headline font-semibold text-on-surface">{seq.name}</h1>
              <Badge variant={status.variant} dot pulse={seq.status === "ACTIVE"}>
                {status.label}
              </Badge>
            </div>
            {seq.description && <p className="mt-1 text-body text-on-surface-variant">{seq.description}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {/* Drafts and paused sequences edit in place; an active one pauses first */}
            {!editing && (seq.status === "DRAFT" || seq.status === "PAUSED") && (
              <Button variant="secondary" onClick={() => setEditing(true)} disabled={busy}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
            {!editing && seq.status === "ACTIVE" && (
              <Button
                variant="secondary"
                onClick={() => pause.mutate(seq.id, { onSuccess: () => setEditing(true) })}
                loading={pause.isPending}
                disabled={busy}
                title="Pauses the sequence so you can edit it, then resume when you're done"
              >
                <Pencil className="h-4 w-4" /> Pause &amp; edit
              </Button>
            )}
            {!editing && seq.status === "DRAFT" && (
              <Button onClick={() => start.mutate(seq.id)} loading={start.isPending} disabled={busy}>
                <Play className="h-4 w-4" /> Start
              </Button>
            )}
            {!editing && seq.status === "ACTIVE" && (
              <Button variant="secondary" onClick={() => pause.mutate(seq.id)} loading={pause.isPending} disabled={busy}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
            )}
            {!editing && seq.status === "PAUSED" && (
              <Button onClick={() => resume.mutate(seq.id)} loading={resume.isPending} disabled={busy}>
                <RotateCcw className="h-4 w-4" /> Resume
              </Button>
            )}
            {(seq.status === "ACTIVE" || seq.status === "PAUSED") && (
              <Button variant="ghost" onClick={() => cancel.mutate(seq.id)} loading={cancel.isPending} disabled={busy}>
                <StopCircle className="h-4 w-4" /> Stop
              </Button>
            )}
            <Button variant="ghost" onClick={() => setConfirmDelete(true)} aria-label="Delete sequence" title="Delete">
              <Trash2 className="h-4 w-4 text-error" />
            </Button>
          </div>
        </div>
      </div>

      {editing ? (
        <SequenceEditor sequence={seq} onDone={() => setEditing(false)} />
      ) : (
      <>
      {/* Headline numbers */}
      <SequenceAnalytics sequenceId={seq.id} show={{ stats: true, insights: false, recipients: false }} />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* Message timeline */}
        <section aria-labelledby="messages-title" className={`${CARD} p-5`}>
          <h2 id="messages-title" className="mb-4 text-title-sm font-semibold text-on-surface">
            Messages <span className="font-normal text-on-surface-variant tabular-nums">{steps.length}</span>
          </h2>
          <ol className="relative">
            {steps.map((step, i) => (
              <li key={step.id} className="relative pb-6 pl-10 last:pb-0">
                {/* Connector line down to the next message */}
                {i < steps.length - 1 && (
                  <span aria-hidden className="absolute left-[13px] top-7 bottom-0 w-px bg-outline-variant" />
                )}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 grid size-7 place-items-center rounded-full bg-primary/10 text-label font-semibold tabular-nums text-primary"
                >
                  {i + 1}
                </span>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 className="text-body font-semibold text-on-surface">{step.name || `Message ${i + 1}`}</h3>
                  <span className="inline-flex items-center gap-1 text-label text-on-surface-variant">
                    <Clock className="h-3 w-3" aria-hidden />
                    {i === 0
                      ? seq.triggerType
                        ? `${formatDelay(step.delayMinutes)} after the trigger`
                        : "Sent first"
                      : `${formatDelay(step.delayMinutes)} after message ${i}`}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface-container-low px-3.5 py-2.5 text-body text-on-surface">
                  {step.messageBody || <span className="text-on-surface-variant">No text</span>}
                </p>
                {step.conditions && step.conditions.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {step.conditions.map((c, ci) => (
                      <li key={ci} className="flex items-center gap-1.5 text-label text-tertiary">
                        <GitBranch className="h-3 w-3" aria-hidden />
                        If they reply “{c.keyword}”, go to message {c.goToStepOrder + 1}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>

        {/* Summary panel (sticky on desktop) */}
        <aside aria-labelledby="details-title" className={`${CARD} p-5 lg:sticky lg:top-[calc(var(--header-height)+16px)]`}>
          <h2 id="details-title" className="mb-1 text-title-sm font-semibold text-on-surface">
            Details
          </h2>
          <dl className="divide-y divide-outline-variant">
            <Detail term="Status">
              <Badge variant={status.variant} dot>
                {status.label}
              </Badge>
            </Detail>
            <Detail term="Who gets it">{audienceLabel(seq, pipelines)}</Detail>
            <Detail term="Stops on reply">{seq.exitOnReply ? "Yes" : "No"}</Detail>
            <Detail term="Created by">
              {seq.createdBy ? `${seq.createdBy.firstName} ${seq.createdBy.lastName}`.trim() : "—"}
            </Detail>
            <Detail term="Created">{formatDate(seq.createdAt)}</Detail>
            <Detail term="Started">{formatDate(seq.startedAt)}</Detail>
            {seq.completedAt && <Detail term="Finished">{formatDate(seq.completedAt)}</Detail>}
          </dl>
        </aside>
      </div>

      {/* Funnel, exit reasons and the recipients list */}
      <SequenceAnalytics sequenceId={seq.id} show={{ stats: false, insights: true, recipients: true }} />
      </>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete sequence?"
        message={`"${seq.name}" and its message history will be removed. Contacts in it stop getting its messages. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => remove.mutate(seq.id, { onSuccess: () => router.push("/sequences") })}
      />
    </div>
  );
}

/** Plain-language "who gets it": the trigger for always-on sequences, else the audience. */
function audienceLabel(
  seq: CampaignSequence,
  pipelines: { stages: { id: string; name: string }[] }[] | undefined,
): string {
  if (seq.triggerType === "DEAL_STAGE_CHANGED") {
    const stage = pipelines?.flatMap((p) => p.stages).find((s) => s.id === seq.triggerConfig?.stageId);
    return stage ? `When a deal moves to ${stage.name}` : "When a deal changes stage";
  }
  if (seq.triggerType === "LEAD_STATUS_CHANGED") {
    const to = seq.triggerConfig?.toStatus;
    return to ? `When a lead becomes ${LEAD_STATUS_LABEL[to] ?? to}` : "When a lead's status changes";
  }
  if (seq.triggerType === "CONTACT_CREATED") return "Each new contact";
  const filters = seq.audienceFilters ?? {};
  if ("scrapeRunId" in filters) return "Leads from a lead scrape";
  if ("productIds" in filters) return "Contacts with selected products";
  return seq.audienceType === "ALL" ? "All contacts" : "A filtered audience";
}
