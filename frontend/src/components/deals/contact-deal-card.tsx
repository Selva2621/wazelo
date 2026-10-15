"use client";

import { useMemo, useState } from "react";
import { Briefcase, AlarmClock, Check, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useContactDeals,
  useCreateDeal,
  useMoveDeal,
  usePipelines,
  useSetFollowUp,
  useUpdateDeal,
} from "@/hooks/use-deals";
import type { Deal } from "@/lib/types/deals";
import { DealGuardStrip } from "./deal-guard-strip";

/** Quick picks: tomorrow / in 3 days / next week, at 10:00 local time */
function atTenAm(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

const QUICK_PICKS = [
  { label: "Tomorrow", days: 1 },
  { label: "3 days", days: 3 },
  { label: "Next week", days: 7 },
];

export function formatFollowUp(iso: string): { text: string; overdue: boolean } {
  const due = new Date(iso);
  const now = new Date();
  const overdue = due.getTime() < now.getTime();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const dayDiff = Math.floor((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - startOfToday) / 86_400_000);
  const time = due.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  if (dayDiff === 0) return { text: `Today ${time}`, overdue };
  if (dayDiff === 1) return { text: `Tomorrow ${time}`, overdue };
  if (dayDiff < 0) return { text: `${-dayDiff}d overdue`, overdue: true };
  return { text: due.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }) + ` ${time}`, overdue };
}

const SECTION_LABEL = "text-label font-medium text-on-surface-variant uppercase tracking-wide";

/** Deal + next follow-up for one contact, shown in the inbox contact panel. */
export function ContactDealCard({
  contactId,
  contactName,
  onUseMessage,
}: {
  contactId: string;
  contactName: string;
  /** Put a suggested message into the chat box */
  onUseMessage?: (text: string) => void;
}) {
  const { data: deals, isLoading } = useContactDeals(contactId || null);
  const { data: pipelines } = usePipelines();

  // The open deal if there is one, else the most recent
  const deal: Deal | undefined = useMemo(
    () => deals?.find((d) => d.status === "OPEN") ?? deals?.[0],
    [deals],
  );

  if (!contactId || isLoading) return null;

  return deal ? (
    <DealDetails
      deal={deal}
      stages={pipelines?.find((p) => p.id === deal.pipelineId)?.stages ?? []}
      onUseMessage={onUseMessage}
    />
  ) : (
    <CreateDealInline
      contactId={contactId}
      contactName={contactName}
      pipeline={pipelines?.find((p) => p.isDefault) ?? pipelines?.[0]}
    />
  );
}

function CreateDealInline({
  contactId,
  contactName,
  pipeline,
}: {
  contactId: string;
  contactName: string;
  pipeline?: { id: string; stages: { id: string; order: number }[] };
}) {
  const createDeal = useCreateDeal();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(`${contactName} — project`);
  const [value, setValue] = useState("");

  const firstStage = pipeline?.stages.slice().sort((a, b) => a.order - b.order)[0];
  if (!pipeline || !firstStage) return null;

  if (!open) {
    return (
      <div>
        <span className={SECTION_LABEL}>Deal</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-1.5 flex w-full items-center gap-2 rounded-lg border border-dashed border-outline-variant/40 px-3 py-2.5 text-body font-medium text-on-surface-variant transition-colors hover:border-primary/50 hover:text-primary"
        >
          <Plus className="h-4 w-4" />
          Create deal
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <span className={SECTION_LABEL}>New deal</span>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d.]/g, ""))}
        placeholder="Value (₹)"
        inputMode="decimal"
      />
      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button
          size="sm"
          loading={createDeal.isPending}
          disabled={!title.trim()}
          onClick={() =>
            createDeal.mutate(
              {
                pipelineId: pipeline.id,
                stageId: firstStage.id,
                contactId,
                title: title.trim(),
                value: value ? Number(value) : undefined,
              },
              { onSuccess: () => setOpen(false) },
            )
          }
        >
          Create
        </Button>
      </div>
    </div>
  );
}

function DealDetails({
  deal,
  stages,
  onUseMessage,
}: {
  deal: Deal;
  stages: { id: string; name: string; order: number; color: string | null }[];
  onUseMessage?: (text: string) => void;
}) {
  const moveDeal = useMoveDeal();
  const updateDeal = useUpdateDeal();
  const setFollowUp = useSetFollowUp();
  const [editingValue, setEditingValue] = useState(false);
  const [valueDraft, setValueDraft] = useState(deal.value != null ? String(deal.value) : "");
  const [customOpen, setCustomOpen] = useState(false);
  const [customAt, setCustomAt] = useState("");

  const sortedStages = stages.slice().sort((a, b) => a.order - b.order);
  const followUp = deal.nextFollowUpAt ? formatFollowUp(deal.nextFollowUpAt) : null;
  const closed = deal.status !== "OPEN";

  const schedule = (iso: string) =>
    setFollowUp.mutate({ pipelineId: deal.pipelineId, dealId: deal.id, nextFollowUpAt: iso });

  return (
    <div className="space-y-4">
      <div>
        <span className={SECTION_LABEL}>Deal</span>
        <div className="mt-1.5 space-y-2 rounded-lg bg-surface-container p-3">
          <p className="flex items-center gap-2 text-body font-medium text-on-surface">
            <Briefcase className="h-4 w-4 shrink-0 text-on-surface-variant" />
            <span className="truncate">{deal.title}</span>
          </p>

          <label className="flex items-center justify-between gap-2 text-label text-on-surface-variant">
            Stage
            <select
              value={deal.stageId}
              disabled={moveDeal.isPending}
              onChange={(e) =>
                moveDeal.mutate({ pipelineId: deal.pipelineId, dealId: deal.id, stageId: e.target.value })
              }
              className="min-w-0 max-w-[60%] rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-body text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
            >
              {sortedStages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex items-center justify-between gap-2 text-label text-on-surface-variant">
            Value
            {editingValue ? (
              <span className="flex items-center gap-1">
                <input
                  autoFocus
                  value={valueDraft}
                  inputMode="decimal"
                  onChange={(e) => setValueDraft(e.target.value.replace(/[^\d.]/g, ""))}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingValue(false);
                    if (e.key === "Enter") {
                      updateDeal.mutate({ pipelineId: deal.pipelineId, dealId: deal.id, value: Number(valueDraft || 0) });
                      setEditingValue(false);
                    }
                  }}
                  className="w-24 rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-right text-body text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
                />
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setEditingValue(true)}
                className="text-body font-medium tabular-nums text-on-surface hover:text-primary"
                title="Edit value"
              >
                {deal.value != null ? `₹${Number(deal.value).toLocaleString("en-IN")}` : "Add value"}
              </button>
            )}
          </div>
        </div>
      </div>

      {!closed && (
        <div>
          <span className={SECTION_LABEL}>Follow-up</span>
          <div className="mt-1.5 space-y-2">
            {followUp ? (
              <div
                className={cn(
                  "flex items-center justify-between gap-2 rounded-lg px-3 py-2",
                  followUp.overdue ? "bg-error-container/60 text-error" : "bg-surface-container text-on-surface",
                )}
              >
                <span className="flex items-center gap-2 text-body font-medium">
                  <AlarmClock className="h-4 w-4 shrink-0" />
                  {followUp.text}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  loading={setFollowUp.isPending}
                  onClick={() =>
                    setFollowUp.mutate({ pipelineId: deal.pipelineId, dealId: deal.id, nextFollowUpAt: null })
                  }
                >
                  <Check className="h-3.5 w-3.5" />
                  Done
                </Button>
              </div>
            ) : (
              <p className="text-label text-on-surface-variant">No follow-up set</p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  disabled={setFollowUp.isPending}
                  onClick={() => schedule(atTenAm(p.days))}
                  className="rounded-full border border-outline-variant/30 px-2.5 py-1 text-label text-on-surface transition-colors hover:border-primary/50 hover:text-primary disabled:opacity-50"
                >
                  {p.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomOpen((v) => !v)}
                className="rounded-full border border-outline-variant/30 px-2.5 py-1 text-label text-on-surface-variant transition-colors hover:text-primary"
              >
                Pick…
              </button>
            </div>

            {customOpen && (
              <div className="flex items-center gap-2">
                <input
                  type="datetime-local"
                  value={customAt}
                  onChange={(e) => setCustomAt(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-body text-on-surface outline-none focus:ring-2 focus:ring-primary/40"
                />
                <Button
                  size="sm"
                  disabled={!customAt}
                  onClick={() => {
                    schedule(new Date(customAt).toISOString());
                    setCustomOpen(false);
                    setCustomAt("");
                  }}
                >
                  Set
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      <DealGuardStrip deal={deal} onUseMessage={onUseMessage} />
    </div>
  );
}
