"use client";

import { useState } from "react";
import { X, Plus, Trash2, Clock, ArrowDown, ArrowLeft, GripVertical, GitBranch, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import { useScrapeRuns } from "@/hooks/use-lead-scraper";
import { hasOutreachBlanks } from "@/lib/constants/outreach";
import {
  getSequencePresets,
  presetSummary,
  presetTriggerLabel,
  type PresetTrigger,
  type SequencePreset,
} from "@/lib/constants/sequence-presets";
import { useOrgSettings } from "@/hooks/use-settings";
import { usePipelines } from "@/hooks/use-deals";
import { useAuthStore } from "@/stores/auth-store";
import type { Pipeline } from "@/lib/types/deals";
import type { LeadStatus } from "@/lib/types/contacts";
import type {
  CreateSequenceRequest,
  CreateSequenceStepRequest,
  SequenceTrigger,
  SequenceTriggerType,
  StepCondition,
} from "@/lib/types/sequences";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppPhonePreview } from "@/components/whatsapp/whatsapp-phone-preview";

interface CreateSequenceModalProps {
  /** Defaults to true so callers that mount the modal conditionally keep working. */
  open?: boolean;
  sessionId: string;
  onSubmit: (data: CreateSequenceRequest) => void;
  onClose: () => void;
  submitting?: boolean;
}

const EMPTY_STEPS = [
  { messageType: "TEXT", messageBody: "", delayMinutes: 0 },
  { messageType: "TEXT", messageBody: "", delayMinutes: 1440 },
];

const DELAY_PRESETS = [
  { label: "Immediately", value: 0 },
  { label: "5 min", value: 5 },
  { label: "1 hour", value: 60 },
  { label: "4 hours", value: 240 },
  { label: "1 day", value: 1440 },
  { label: "2 days", value: 2880 },
  { label: "3 days", value: 4320 },
  { label: "7 days", value: 10080 },
];

function formatDelay(minutes: number): string {
  const preset = DELAY_PRESETS.find((p) => p.value === minutes);
  if (preset) return preset.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} days`;
  if (minutes % 60 === 0) return `${minutes / 60} hours`;
  return `${minutes} min`;
}

const TRIGGER_OPTIONS: { value: SequenceTriggerType; label: string }[] = [
  { value: "DEAL_STAGE_CHANGED", label: "A deal moves to a stage" },
  { value: "LEAD_STATUS_CHANGED", label: "A lead's status changes to" },
  { value: "CONTACT_CREATED", label: "A new contact is added" },
];

const LEAD_STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "INTERESTED", label: "Interested" },
  { value: "CONVERTED", label: "Converted" },
  { value: "CLOSED", label: "Closed" },
];

/** The org's stage a preset means by "proposal" / "won", default pipeline first */
function presetStageId(pipelines: Pipeline[] | undefined, stage: "proposal" | "won"): string | undefined {
  const ordered = [...(pipelines ?? [])].sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  for (const p of ordered) {
    const found = p.stages.find((s) => (stage === "won" ? s.isWonStage : /proposal/i.test(s.name)));
    if (found) return found.id;
  }
  return undefined;
}

function triggerFromPreset(t: PresetTrigger, pipelines: Pipeline[] | undefined): SequenceTrigger {
  return t.type === "DEAL_STAGE_CHANGED" ? { type: t.type, stageId: presetStageId(pipelines, t.stage) } : { type: t.type };
}

export function CreateSequenceModal({ open = true, ...props }: CreateSequenceModalProps) {
  return (
    <Modal
      open={open}
      onClose={props.onClose}
      dismissible={!props.submitting}
      aria-labelledby="create-sequence-title"
      className="max-w-2xl lg:max-w-5xl rounded-3xl bg-surface max-h-[90vh] flex flex-col overflow-hidden"
    >
      {/* Form state lives in a child so it resets each time the modal opens. */}
      {() => <CreateSequenceForm {...props} />}
    </Modal>
  );
}

function CreateSequenceForm({ sessionId, onSubmit, onClose, submitting }: Omit<CreateSequenceModalProps, "open">) {
  const [view, setView] = useState<"templates" | "form">("templates");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exitOnReply, setExitOnReply] = useState(true);
  // AUTO: contacts join one at a time when the trigger fires; AUDIENCE: everyone matching, once
  const [joinMode, setJoinMode] = useState<"AUTO" | "AUDIENCE">("AUDIENCE");
  const [trigger, setTrigger] = useState<SequenceTrigger>({ type: "DEAL_STAGE_CHANGED" });
  const { data: pipelines } = usePipelines();
  // SCRAPED is a UI choice — it's sent as FILTERED with a scrape-run filter
  const [audienceType, setAudienceType] = useState<"ALL" | "FILTERED" | "SCRAPED">("ALL");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [scrapeRunId, setScrapeRunId] = useState("");
  const [onlyNewLeads, setOnlyNewLeads] = useState(true);
  const { data: scrapeRunsData } = useScrapeRuns({ take: 50 });
  const scrapeRuns = (scrapeRunsData?.runs ?? []).filter((r) => r.status === "COMPLETED" && r.importedCount > 0);
  const [steps, setSteps] = useState<(CreateSequenceStepRequest & { _key: number; conditions?: StepCondition[] })[]>(
    EMPTY_STEPS.map((s, i) => ({ ...s, _key: i })),
  );

  const { data: products } = useProducts();
  const { data: orgSettings } = useOrgSettings();
  // Login already returns orgType, so the right preset set shows before settings load
  const user = useAuthStore((s) => s.user);
  const userOrgType = user?.orgType;
  const senderName = user ? `${user.firstName} ${user.lastName}`.trim() : undefined;
  const presets = getSequencePresets({ ...orgSettings, orgType: orgSettings?.orgType ?? userOrgType });
  let nextKey = steps.length;

  const applyPreset = (preset: SequencePreset | null) => {
    setName(preset?.name ?? "");
    setDescription(preset?.description ?? "");
    setExitOnReply(preset?.exitOnReply ?? true);
    setSteps((preset?.steps ?? EMPTY_STEPS).map((s, i) => ({ ...s, _key: i })));
    setJoinMode(preset?.trigger ? "AUTO" : "AUDIENCE");
    setTrigger(preset?.trigger ? triggerFromPreset(preset.trigger, pipelines) : { type: "DEAL_STAGE_CHANGED" });
    setView("form");
  };

  const triggerReady =
    trigger.type === "DEAL_STAGE_CHANGED"
      ? !!trigger.stageId
      : trigger.type === "LEAD_STATUS_CHANGED"
        ? !!trigger.toStatus
        : true;

  const addStep = () => {
    setSteps([...steps, { _key: nextKey++, messageType: "TEXT", messageBody: "", delayMinutes: 1440 }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: unknown) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addCondition = (stepIndex: number) => {
    const step = steps[stepIndex];
    const conditions = step.conditions || [];
    updateStep(stepIndex, "conditions", [...conditions, { keyword: "", goToStepOrder: 0 }]);
  };

  const updateCondition = (stepIndex: number, condIndex: number, field: string, value: unknown) => {
    const conditions = [...(steps[stepIndex].conditions || [])];
    conditions[condIndex] = { ...conditions[condIndex], [field]: value };
    updateStep(stepIndex, "conditions", conditions);
  };

  const removeCondition = (stepIndex: number, condIndex: number) => {
    const conditions = (steps[stepIndex].conditions || []).filter((_, i) => i !== condIndex);
    updateStep(stepIndex, "conditions", conditions.length > 0 ? conditions : undefined);
  };

  const hasBlanks = steps.some((s) => hasOutreachBlanks(s.messageBody ?? ""));
  const canSubmit =
    name.trim() &&
    steps.length > 0 &&
    steps.every((s) => s.messageBody?.trim()) &&
    !hasBlanks &&
    (joinMode === "AUTO" ? triggerReady : audienceType !== "SCRAPED" || !!scrapeRunId);

  const audienceFilters =
    audienceType === "SCRAPED"
      ? { scrapeRunId, ...(onlyNewLeads && { leadStatuses: ["NEW"] }) }
      : audienceType === "FILTERED" && selectedProductIds.length > 0
        ? { productIds: selectedProductIds }
        : undefined;

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      sessionId,
      ...(joinMode === "AUTO"
        ? { audienceType: "FILTERED" as const, trigger }
        : { audienceType: audienceType === "SCRAPED" ? "FILTERED" : audienceType, audienceFilters }),
      exitOnReply,
      steps: steps.map((s) => ({
        messageType: s.messageType || "TEXT",
        messageBody: s.messageBody,
        delayMinutes: s.delayMinutes ?? 1440,
        name: s.name,
        conditions: s.conditions?.filter((c) => c.keyword.trim()) || undefined,
      })),
    });
  };

  return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <h2 id="create-sequence-title" className="text-title font-semibold text-on-surface">Create Drip Sequence</h2>
          <IconButton size="sm" variant="danger" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        {view === "templates" ? (
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            <p className="text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">
              Start from a template
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="text-left rounded-2xl border border-outline-variant/30 bg-surface-container-low p-4 transition-colors hover:border-primary/40 hover:bg-primary/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <p className="text-body font-semibold text-on-surface">{preset.name}</p>
                  <p className="text-label text-on-surface-variant mt-1">{preset.description}</p>
                  <p className="text-caption text-on-surface-variant/60 mt-2">{presetSummary(preset)}</p>
                  {presetTriggerLabel(preset) && (
                    <p className="text-caption font-medium text-primary mt-1">{presetTriggerLabel(preset)}</p>
                  )}
                </button>
              ))}
            </div>
            <Button variant="secondary" type="button" onClick={() => applyPreset(null)} className="w-full">
              <Plus className="h-4 w-4" />
              Start from scratch
            </Button>
          </div>
        ) : (
        <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <button
            type="button"
            onClick={() => setView("templates")}
            disabled={submitting}
            className="flex items-center gap-1 text-label font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Templates
          </button>

          {/* Name */}
          <div>
            <label className="text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">
              Sequence Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome series, Re-engagement..."
              maxLength={255}
              className="w-full mt-1 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this sequence does..."
              rows={2}
              className="w-full mt-1 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Exit on reply */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exitOnReply}
              onChange={(e) => setExitOnReply(e.target.checked)}
              className="rounded border-outline-variant/30 text-primary focus:ring-primary"
            />
            <span className="text-body text-on-surface">Exit sequence when contact replies</span>
          </label>

          {/* Who gets it */}
          <fieldset className="space-y-2">
            <legend className="text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide flex items-center gap-1 mb-2">
              <Filter className="h-3 w-3" /> Who gets it
            </legend>
            {(
              [
                { mode: "AUTO", title: "Automatically, one contact at a time", hint: "Runs on its own whenever the trigger happens" },
                { mode: "AUDIENCE", title: "Everyone in an audience, now", hint: "Sent once to all matching contacts when you start it" },
              ] as const
            ).map((opt) => (
              <label
                key={opt.mode}
                className={cn(
                  "flex items-start gap-2.5 rounded-xl border p-3 cursor-pointer transition-colors",
                  joinMode === opt.mode ? "border-primary bg-primary/5" : "border-outline-variant/20 hover:bg-surface-container",
                )}
              >
                <input
                  type="radio"
                  name="join-mode"
                  checked={joinMode === opt.mode}
                  onChange={() => setJoinMode(opt.mode)}
                  className="mt-0.5 text-primary focus:ring-primary"
                />
                <span>
                  <span className="block text-body text-on-surface">{opt.title}</span>
                  <span className="block text-caption text-on-surface-variant/70">{opt.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {joinMode === "AUTO" && (
            <div className="space-y-2 pl-2 border-l-2 border-primary/30">
              <label htmlFor="seq-trigger" className="text-caption text-on-surface-variant/70">Start when</label>
              <select
                id="seq-trigger"
                value={trigger.type}
                onChange={(e) => setTrigger({ type: e.target.value as SequenceTriggerType })}
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-label text-on-surface focus:border-primary focus:outline-none"
              >
                {TRIGGER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {trigger.type === "DEAL_STAGE_CHANGED" &&
                (pipelines?.length ? (
                  <select
                    aria-label="Deal stage"
                    value={trigger.stageId ?? ""}
                    onChange={(e) => setTrigger({ type: "DEAL_STAGE_CHANGED", stageId: e.target.value || undefined })}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-label text-on-surface focus:border-primary focus:outline-none"
                  >
                    <option value="">Choose a stage…</option>
                    {pipelines.map((p) =>
                      pipelines.length === 1 ? (
                        p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                      ) : (
                        <optgroup key={p.id} label={p.name}>
                          {p.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </optgroup>
                      ),
                    )}
                  </select>
                ) : (
                  <p className="text-caption text-on-surface-variant/60">No deal pipeline yet. Create one in Deals first.</p>
                ))}

              {trigger.type === "LEAD_STATUS_CHANGED" && (
                <select
                  aria-label="Lead status"
                  value={trigger.toStatus ?? ""}
                  onChange={(e) =>
                    setTrigger({ type: "LEAD_STATUS_CHANGED", toStatus: (e.target.value || undefined) as LeadStatus | undefined })
                  }
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-label text-on-surface focus:border-primary focus:outline-none"
                >
                  <option value="">Choose a status…</option>
                  {LEAD_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}

              {trigger.type === "CONTACT_CREATED" && (
                <p className="text-caption text-on-surface-variant/60">
                  Includes people who message you first. Leads imported from the Lead Scraper are left out.
                </p>
              )}
            </div>
          )}

          {joinMode === "AUDIENCE" && (
          <div className="space-y-2">
            <p className="text-caption text-on-surface-variant/70">Audience</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudienceType("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-label border transition-colors",
                  audienceType === "ALL"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface border-outline-variant/20 text-on-surface hover:bg-surface-container",
                )}
              >
                All Contacts
              </button>
              <button
                type="button"
                onClick={() => setAudienceType("FILTERED")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-label border transition-colors",
                  audienceType === "FILTERED"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface border-outline-variant/20 text-on-surface hover:bg-surface-container",
                )}
              >
                Filtered by Product
              </button>
              <button
                type="button"
                onClick={() => setAudienceType("SCRAPED")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-label border transition-colors",
                  audienceType === "SCRAPED"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface border-outline-variant/20 text-on-surface hover:bg-surface-container",
                )}
              >
                Scraped leads
              </button>
            </div>

            {audienceType === "SCRAPED" && (
              <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                {scrapeRuns.length === 0 ? (
                  <p className="text-caption text-on-surface-variant/60">
                    No scrape runs with imported leads yet. Import leads from the Lead Scraper first.
                  </p>
                ) : (
                  <>
                    <select
                      value={scrapeRunId}
                      onChange={(e) => setScrapeRunId(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-label text-on-surface focus:border-primary focus:outline-none"
                    >
                      <option value="">Choose a scrape run…</option>
                      {scrapeRuns.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.keywords}{r.location ? ` – ${r.location}` : ""} ({r.importedCount} imported)
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={onlyNewLeads}
                        onChange={(e) => setOnlyNewLeads(e.target.checked)}
                        className="rounded border-outline-variant/30 text-primary focus:ring-primary"
                      />
                      <span className="text-label text-on-surface">Only leads not contacted yet</span>
                    </label>
                    <p className="text-caption text-on-surface-variant/60">
                      New contacts are capped per day to protect your WhatsApp number — the rest go out on the following days.
                    </p>
                  </>
                )}
              </div>
            )}

            {audienceType === "FILTERED" && products && products.length > 0 && (
              <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                <span className="text-caption text-on-surface-variant/60">Select products:</span>
                {products.filter((p) => p.status === "ACTIVE").map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds([...selectedProductIds, p.id]);
                        } else {
                          setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                        }
                      }}
                      className="rounded border-outline-variant/30 text-primary focus:ring-primary"
                    />
                    <span className="text-label text-on-surface">{p.name}</span>
                  </label>
                ))}
                {selectedProductIds.length === 0 && (
                  <p className="text-caption text-warning">Select at least one product</p>
                )}
              </div>
            )}

            {audienceType === "FILTERED" && (!products || products.length === 0) && (
              <p className="text-caption text-on-surface-variant/50 pl-2">
                No products created yet. Go to Settings → Products to create one.
              </p>
            )}
          </div>
          )}

          {/* Steps */}
          <div>
            <p className="text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide mb-2">
              Steps ({steps.length})
            </p>

            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step._key}>
                  {/* Delay indicator; the first step's only matters when a trigger starts it */}
                  {(index > 0 || joinMode === "AUTO") && (
                    <div className={cn("flex items-center gap-2 pl-6", index > 0 ? "py-2" : "pb-2")}>
                      {index > 0 && <ArrowDown className="h-4 w-4 text-on-surface-variant/40" />}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-on-surface-variant/50" />
                        <span className="text-caption text-on-surface-variant/60">
                          {index === 0 ? "After the trigger, wait" : "Wait"}
                        </span>
                        <select
                          value={step.delayMinutes}
                          onChange={(e) => updateStep(index, "delayMinutes", parseInt(e.target.value))}
                          className="rounded-lg border border-outline-variant/20 bg-surface px-2 py-0.5 text-caption text-on-surface focus:border-primary focus:outline-none"
                        >
                          {DELAY_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step card */}
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="h-4 w-4 text-on-surface-variant/30" />
                      <span className="text-label font-semibold text-on-surface-variant">
                        Step {index + 1}
                      </span>
                      <input
                        value={step.name || ""}
                        onChange={(e) => updateStep(index, "name", e.target.value)}
                        placeholder="Step name (optional)"
                        className="flex-1 rounded-lg border-0 bg-transparent px-2 py-0.5 text-label text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                      />
                      {steps.length > 1 && (
                        <IconButton size="xs" variant="danger"
                          onClick={() => removeStep(index)} aria-label="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      )}
                    </div>
                    <textarea
                      value={step.messageBody || ""}
                      onChange={(e) => updateStep(index, "messageBody", e.target.value)}
                      placeholder="Message content..."
                      rows={2}
                      maxLength={4096}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-body text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none resize-none"
                    />

                    {/* Conditions button */}
                    {steps.length > 1 && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => addCondition(index)}
                          className="flex items-center gap-1 text-caption text-tertiary hover:text-tertiary/80 transition-colors"
                        >
                          <GitBranch className="h-3 w-3" /> Add Condition
                        </button>
                      </div>
                    )}

                    {/* Conditions */}
                    {step.conditions && step.conditions.length > 0 && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-tertiary/30">
                        <p className="text-caption font-medium text-tertiary/70 uppercase tracking-wide">
                          If customer replies with keyword:
                        </p>
                        {step.conditions.map((cond, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <input
                              value={cond.keyword}
                              onChange={(e) => updateCondition(index, ci, "keyword", e.target.value)}
                              placeholder="keyword..."
                              className="flex-1 rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-caption text-on-surface focus:border-tertiary focus:outline-none"
                            />
                            <span className="text-caption text-on-surface-variant/50">→ go to</span>
                            <select
                              value={cond.goToStepOrder}
                              onChange={(e) => updateCondition(index, ci, "goToStepOrder", parseInt(e.target.value))}
                              className="rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-caption text-on-surface"
                            >
                              {steps.map((_, si) => (
                                <option key={si} value={si}>Step {si + 1}</option>
                              ))}
                            </select>
                            <IconButton size="xs" variant="danger"
                              onClick={() => removeCondition(index, ci)} aria-label="Remove">
                              <X className="h-3 w-3" />
                            </IconButton>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="mt-2 flex items-center gap-1.5 text-label font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add step
            </button>
          </div>
        </div>

        {/* What the contact sees, step by step */}
        <div className="hidden lg:flex w-[320px] shrink-0 flex-col items-center overflow-y-auto border-l border-outline-variant/15 bg-surface-container-lowest px-6 py-4">
          <p className="self-stretch text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide mb-3">
            Preview
          </p>
          <WhatsAppPhonePreview
            senderName={senderName}
            messages={steps.map((s, i) => ({
              key: s._key,
              body: s.messageBody ?? "",
              messageType: s.messageType,
              gapLabel:
                (i > 0 || joinMode === "AUTO") && s.delayMinutes
                  ? `After ${formatDelay(s.delayMinutes)}`
                  : undefined,
            }))}
          />
        </div>
        </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {view === "form" && (
            <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
              {submitting ? "Creating..." : joinMode === "AUTO" ? "Create & turn on" : "Create Sequence"}
            </Button>
          )}
        </div>
      </>
  );
}
