"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import {
  X,
  Plus,
  Trash2,
  Clock,
  ArrowDown,
  FileText,
  LayoutTemplate,
  GitBranch,
  Sparkles,
  ChevronDown,
  Loader2,
  Undo2,
} from "lucide-react";
import { useGenerateSequence, useRewriteSequenceStep } from "@/hooks/use-sequences";
import type { GeneratedSequence, SequenceRewriteStyle } from "@/lib/api/sequences";
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
      className="max-w-2xl lg:max-w-5xl rounded-2xl bg-surface max-h-[90vh] flex flex-col overflow-hidden"
    >
      {/* Form state lives in a child so it resets each time the modal opens. */}
      {() => <CreateSequenceForm {...props} />}
    </Modal>
  );
}

/** Form field styles, shared so every label/input in the dialog matches. */
const FIELD_LABEL = "text-label font-medium text-on-surface";
const FIELD_INPUT =
  "mt-1 w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body text-on-surface placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
/** Full-width select, same look as the text inputs */
const FIELD_SELECT =
  "w-full rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
/** Inline compact select/input (wait times, conditions) */
const FIELD_SMALL =
  "rounded-lg border border-outline-variant bg-surface-container-lowest px-2 py-1 text-caption text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";
/** Native checkbox/radio in the brand colour (not the browser blue) */
const FIELD_CHECK = "size-4 shrink-0 cursor-pointer accent-primary";

/** Numbered section heading so the form reads as 1 → 2 → 3 */
function FormSection({ step, title, id, children }: { step: number; title: string; id: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={cn("space-y-3", step > 1 && "border-t border-outline-variant pt-5")}>
      <h3 id={id} className="flex items-center gap-2 text-body font-semibold text-on-surface">
        <span aria-hidden className="grid size-6 place-items-center rounded-full bg-primary/10 text-caption font-semibold tabular-nums text-primary">
          {step}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

/** Nearest wait the form's dropdown offers, so an AI delay always shows as a valid option. */
function snapDelay(minutes: number): number {
  const options = DELAY_PRESETS.map((p) => p.value).filter((v) => v > 0);
  return options.reduce((best, v) => (Math.abs(v - minutes) < Math.abs(best - minutes) ? v : best), options[0]);
}

const AI_STEP_COUNTS = [3, 4, 5];

/** Starter-screen card: describe the goal, pick how many messages, get a filled-in draft. */
function AiDraftCard({ onDraft }: { onDraft: (draft: GeneratedSequence, goal: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [count, setCount] = useState(3);
  const generate = useGenerateSequence();
  const ready = prompt.trim().length >= 5;

  const submit = () => {
    if (!ready || generate.isPending) return;
    const goal = prompt.trim();
    generate.mutate({ prompt: goal, stepCount: count }, { onSuccess: (draft) => onDraft(draft, goal) });
  };

  return (
    <section
      aria-labelledby="ai-draft-title"
      className="rounded-2xl border border-primary/25 bg-primary/5 p-4"
    >
      <h3 id="ai-draft-title" className="flex items-center gap-2 text-body font-semibold text-on-surface">
        <Sparkles className="h-4 w-4 text-primary" aria-hidden />
        Write it with AI
      </h3>
      <label htmlFor="ai-draft-goal" className="mt-1 block text-label text-on-surface-variant">
        What should this sequence do?
      </label>
      <textarea
        id="ai-draft-goal"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          // Ctrl/⌘ + Enter generates
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        rows={2}
        maxLength={600}
        disabled={generate.isPending}
        placeholder="e.g. Follow up with leads who asked for a website quote and remind them about the free consultation"
        className="mt-2 w-full resize-none rounded-xl border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body text-on-surface placeholder:text-placeholder focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      />
      <fieldset className="mt-4" disabled={generate.isPending}>
        <legend className="text-label font-medium text-on-surface">How many messages should it send?</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {AI_STEP_COUNTS.map((n) => {
            const selected = count === n;
            return (
              <label
                key={n}
                className={cn(
                  "relative flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60",
                  selected
                    ? "border-primary bg-surface-container-lowest shadow-sm"
                    : "border-outline-variant bg-surface-container-lowest/60 hover:border-outline",
                )}
              >
                <input
                  type="radio"
                  name="ai-step-count"
                  value={n}
                  checked={selected}
                  onChange={() => setCount(n)}
                  className="sr-only"
                />
                <span className="flex items-center justify-between gap-2">
                  <span className="text-body font-semibold tabular-nums text-on-surface">{n} messages</span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-4 place-items-center rounded-full border",
                      selected ? "border-primary" : "border-outline",
                    )}
                  >
                    {selected && <span className="size-2 rounded-full bg-primary" />}
                  </span>
                </span>
                <span className="text-caption text-on-surface-variant">
                  1 first message + {n - 1} follow-ups
                </span>
                {/* Mini timeline: filled dot = first message, hollow dots = follow-ups */}
                <span aria-hidden className="flex items-center pt-1">
                  {Array.from({ length: n }, (_, i) => (
                    <span key={i} className="flex flex-1 items-center last:flex-none">
                      <span
                        className={cn(
                          "size-2.5 shrink-0 rounded-full",
                          i === 0
                            ? "bg-primary"
                            : selected
                              ? "border-2 border-primary bg-surface-container-lowest"
                              : "border-2 border-outline bg-surface-container-lowest",
                        )}
                      />
                      {i < n - 1 && (
                        <span className={cn("h-px flex-1", selected ? "bg-primary/40" : "bg-outline-variant")} />
                      )}
                    </span>
                  ))}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-caption text-on-surface-variant">
          AI picks the waits (usually 1–3 days apart). You can change everything before saving.
        </p>
        <Button type="button" onClick={submit} disabled={!ready} loading={generate.isPending} className="ml-auto">
          {!generate.isPending && <Sparkles className="h-4 w-4" />}
          {generate.isPending ? "Writing…" : `Write ${count} messages`}
        </Button>
      </div>
    </section>
  );
}

const REWRITE_OPTIONS: { style: SequenceRewriteStyle; label: string }[] = [
  { style: "shorter", label: "Shorter" },
  { style: "friendlier", label: "Friendlier" },
  { style: "formal", label: "More formal" },
];

/** ✦ Rewrite menu under a step's message, with Undo for the last rewrite. */
export function RewriteMenu({
  message,
  goal,
  onRewrite,
}: {
  message: string;
  goal?: string;
  onRewrite: (next: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [previous, setPrevious] = useState<string | null>(null);
  const rewrite = useRewriteSequenceStep();
  const ref = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const run = (style: SequenceRewriteStyle) => {
    setOpen(false);
    const before = message;
    rewrite.mutate(
      { message: before, style, goal },
      {
        onSuccess: ({ messageBody }) => {
          setPrevious(before);
          onRewrite(messageBody);
        },
      },
    );
  };

  const empty = !message.trim();

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={empty || rewrite.isPending}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        title={empty ? "Write a message first" : "Rewrite this message with AI"}
        className="flex items-center gap-1 rounded-md text-caption font-medium text-primary outline-none transition-colors hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        {rewrite.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        {rewrite.isPending ? "Rewriting…" : "Rewrite"}
        {!rewrite.isPending && <ChevronDown className="h-3 w-3" aria-hidden />}
      </button>
      {previous !== null && !rewrite.isPending && (
        <button
          type="button"
          onClick={() => {
            onRewrite(previous);
            setPrevious(null);
          }}
          className="flex items-center gap-1 rounded-md text-caption text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Undo2 className="h-3 w-3" /> Undo
        </button>
      )}
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Rewrite style"
          className="absolute left-0 top-full z-20 mt-1 w-40 overflow-hidden rounded-xl bg-surface-container p-1 shadow-popover"
        >
          {REWRITE_OPTIONS.map((o) => (
            <button
              key={o.style}
              role="menuitem"
              type="button"
              onClick={() => run(o.style)}
              className="flex h-8 w-full items-center rounded-lg px-2.5 text-left text-label text-on-surface outline-none hover:bg-surface-container-high focus-visible:bg-surface-container-high"
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CreateSequenceForm({ sessionId, onSubmit, onClose, submitting }: Omit<CreateSequenceModalProps, "open">) {
  // The form is always shown; templates and AI are optional ways to fill it in
  const [source, setSource] = useState<"blank" | "template" | "ai">("blank");
  const [panelOpen, setPanelOpen] = useState(false);
  const [filledFrom, setFilledFrom] = useState<string | null>(null);
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
  // Step keys must never repeat: deriving them from steps.length reused a key after a
  // delete-then-add, so React mixed up two steps' inputs
  const keySeq = useRef(1000);

  const applyPreset = (preset: SequencePreset | null) => {
    setName(preset?.name ?? "");
    setDescription(preset?.description ?? "");
    setExitOnReply(preset?.exitOnReply ?? true);
    setSteps((preset?.steps ?? EMPTY_STEPS).map((s, i) => ({ ...s, _key: i })));
    setJoinMode(preset?.trigger ? "AUTO" : "AUDIENCE");
    setTrigger(preset?.trigger ? triggerFromPreset(preset.trigger, pipelines) : { type: "DEAL_STAGE_CHANGED" });
    setFilledFrom(preset?.name ?? null);
    setPanelOpen(false);
  };

  const chooseSource = (next: "blank" | "template" | "ai") => {
    if (next === "blank") {
      // Back to an empty form only when it was filled from a template or AI
      if (source !== "blank") {
        applyPreset(null);
        setAiGoal(undefined);
      }
      setPanelOpen(false);
    } else {
      setPanelOpen(true);
    }
    setSource(next);
  };

  // The goal typed into the AI card, passed along so step rewrites keep the same purpose
  const [aiGoal, setAiGoal] = useState<string | undefined>(undefined);

  /** Fill the form from an AI draft; the user reviews and edits before creating. */
  const applyDraft = (draft: GeneratedSequence, goal: string) => {
    setAiGoal(goal);
    setName(draft.name);
    setDescription(draft.description);
    setExitOnReply(true);
    setSteps(
      draft.steps.map((s, i) => ({
        _key: i,
        messageType: "TEXT",
        name: s.name,
        messageBody: s.messageBody,
        delayMinutes: i === 0 ? 0 : snapDelay(s.delayMinutes),
      })),
    );
    setJoinMode("AUDIENCE");
    setTrigger({ type: "DEAL_STAGE_CHANGED" });
    setFilledFrom("AI draft");
    setPanelOpen(false);
  };

  const triggerReady =
    trigger.type === "DEAL_STAGE_CHANGED"
      ? !!trigger.stageId
      : trigger.type === "LEAD_STATUS_CHANGED"
        ? !!trigger.toStatus
        : true;

  const addStep = () => {
    setSteps([...steps, { _key: keySeq.current++, messageType: "TEXT", messageBody: "", delayMinutes: 1440 }]);
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

  // Why the button is off — shown next to it so nobody has to guess
  const blockedReason = (() => {
    if (!name.trim()) return "Give the sequence a name";
    const emptyStep = steps.findIndex((s) => !s.messageBody?.trim());
    if (emptyStep >= 0) return `Write message ${emptyStep + 1}`;
    const blankStep = steps.findIndex((s) => hasOutreachBlanks(s.messageBody ?? ""));
    if (blankStep >= 0) {
      const blank = steps[blankStep].messageBody?.match(/\[[^\]]+\]/)?.[0];
      return `Replace ${blank} in message ${blankStep + 1} with your own words`;
    }
    if (joinMode === "AUTO" && !triggerReady) return "Pick when contacts join";
    if (joinMode !== "AUTO" && audienceType === "SCRAPED" && !scrapeRunId) return "Pick a lead scrape run";
    return null;
  })();

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
          <h2 id="create-sequence-title" className="text-title font-semibold text-on-surface">New sequence</h2>
          <IconButton size="sm" variant="danger" onClick={onClose} aria-label="Close">
            <X className="h-5 w-5" />
          </IconButton>
        </div>

        <div className="flex flex-1 min-h-0">
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 [scrollbar-width:thin]">
          {/* How to start: blank (default), a template, or an AI draft */}
          <div className="space-y-3">
            <div
              role="group"
              aria-label="How to start"
              className="grid grid-cols-3 gap-1 rounded-xl border border-outline-variant bg-surface-container-low p-1"
            >
              {(
                [
                  { value: "blank", label: "Blank", icon: FileText },
                  { value: "template", label: "Use template", icon: LayoutTemplate },
                  { value: "ai", label: "Write with AI", icon: Sparkles },
                ] as const
              ).map((o) => {
                const active = source === o.value;
                const Icon = o.icon;
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={active}
                    aria-expanded={o.value === "blank" ? undefined : active && panelOpen}
                    aria-controls={o.value === "blank" ? undefined : "seq-start-panel"}
                    onClick={() => chooseSource(o.value)}
                    disabled={submitting}
                    className={cn(
                      "flex h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-label font-medium transition-colors",
                      "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                      active
                        ? "bg-surface-container-lowest text-on-surface shadow-sm"
                        : "text-on-surface-variant hover:text-on-surface",
                    )}
                  >
                    <Icon className={cn("h-4 w-4 shrink-0", active && o.value !== "blank" && "text-primary")} aria-hidden />
                    <span className="truncate">{o.label}</span>
                  </button>
                );
              })}
            </div>

            {panelOpen && source === "template" && (
              <div id="seq-start-panel" className="space-y-2">
                <p className="text-caption text-on-surface-variant">Pick one to fill in the form. You can edit everything after.</p>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3 text-left transition-colors hover:border-outline outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <p className="text-label font-semibold text-on-surface">{preset.name}</p>
                      <p className="mt-0.5 text-caption text-on-surface-variant">{preset.description}</p>
                      <p className="mt-1.5 text-caption text-on-surface-variant">
                        {presetSummary(preset)}
                        {presetTriggerLabel(preset) && (
                          <span className="font-medium text-primary"> · {presetTriggerLabel(preset)}</span>
                        )}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {panelOpen && source === "ai" && (
              <div id="seq-start-panel">
                <AiDraftCard onDraft={applyDraft} />
              </div>
            )}

            {!panelOpen && source !== "blank" && filledFrom && (
              <p role="status" className="flex flex-wrap items-center gap-x-2 text-caption text-on-surface-variant">
                <span>
                  Filled from <span className="font-medium text-on-surface">{filledFrom}</span>. Edit anything below.
                </span>
                <button
                  type="button"
                  onClick={() => setPanelOpen(true)}
                  className="rounded font-medium text-primary outline-none hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-focus"
                >
                  {source === "ai" ? "Write again" : "Pick another"}
                </button>
              </p>
            )}
          </div>

          <FormSection step={1} title="Basics" id="seq-section-basics">
          {/* Name */}
          <div>
            <label htmlFor="seq-name" className={FIELD_LABEL}>
              Name <span aria-hidden className="text-error">*</span>
            </label>
            <input
              id="seq-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Welcome series, Re-engagement"
              maxLength={255}
              required
              aria-required="true"
              className={FIELD_INPUT}
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="seq-description" className={FIELD_LABEL}>
              Description
            </label>
            <textarea
              id="seq-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this sequence does"
              rows={2}
              className={cn(FIELD_INPUT, "resize-none")}
            />
          </div>

          {/* Exit on reply */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exitOnReply}
              onChange={(e) => setExitOnReply(e.target.checked)}
              className={FIELD_CHECK}
            />
            <span className="text-body text-on-surface">Stop when the contact replies</span>
          </label>
          </FormSection>

          <FormSection step={2} title="Who gets it" id="seq-section-who">
          <fieldset className="space-y-2">
            <legend className="sr-only">Who gets it</legend>
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
                  joinMode === opt.mode
                    ? "border-primary bg-surface-container-lowest shadow-sm"
                    : "border-outline-variant bg-surface-container-lowest/60 hover:border-outline",
                  "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus",
                )}
              >
                <input
                  type="radio"
                  name="join-mode"
                  checked={joinMode === opt.mode}
                  onChange={() => setJoinMode(opt.mode)}
                  className={cn(FIELD_CHECK, "mt-0.5")}
                />
                <span>
                  <span className="block text-body font-medium text-on-surface">{opt.title}</span>
                  <span className="block text-caption text-on-surface-variant">{opt.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          {joinMode === "AUTO" && (
            <div className="space-y-2 pl-2 border-l-2 border-primary/30">
              <label htmlFor="seq-trigger" className={cn(FIELD_LABEL, "block")}>Start when</label>
              <select
                id="seq-trigger"
                value={trigger.type}
                onChange={(e) => setTrigger({ type: e.target.value as SequenceTriggerType })}
                className={FIELD_SELECT}
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
                    className={FIELD_SELECT}
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
                  <p className="text-caption text-on-surface-variant">No deal pipeline yet. Create one in Deals first.</p>
                ))}

              {trigger.type === "LEAD_STATUS_CHANGED" && (
                <select
                  aria-label="Lead status"
                  value={trigger.toStatus ?? ""}
                  onChange={(e) =>
                    setTrigger({ type: "LEAD_STATUS_CHANGED", toStatus: (e.target.value || undefined) as LeadStatus | undefined })
                  }
                  className={FIELD_SELECT}
                >
                  <option value="">Choose a status…</option>
                  {LEAD_STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              )}

              {trigger.type === "CONTACT_CREATED" && (
                <p className="text-caption text-on-surface-variant">
                  Includes people who message you first. Leads imported from the Lead Scraper are left out.
                </p>
              )}
            </div>
          )}

          {joinMode === "AUDIENCE" && (
          <div className="space-y-2">
            <p id="seq-audience-label" className={FIELD_LABEL}>Audience</p>
            {/* One choice of three: a radio group styled as the shared pill chips */}
            <div role="radiogroup" aria-labelledby="seq-audience-label" className="flex flex-wrap gap-1.5">
              {(
                [
                  { value: "ALL", label: "All contacts" },
                  { value: "FILTERED", label: "By product" },
                  { value: "SCRAPED", label: "Scraped leads" },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={audienceType === o.value}
                  onClick={() => setAudienceType(o.value)}
                  className={cn(
                    "inline-flex h-8 items-center rounded-full border px-3 text-label font-medium transition-colors",
                    "outline-none focus-visible:ring-2 focus-visible:ring-focus",
                    audienceType === o.value
                      ? "border-transparent bg-on-surface text-surface"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant hover:border-outline hover:text-on-surface",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>

            {audienceType === "SCRAPED" && (
              <div className="space-y-2 pl-2 border-l-2 border-primary/30">
                {scrapeRuns.length === 0 ? (
                  <p className="text-caption text-on-surface-variant">
                    No scrape runs with imported leads yet. Import leads from the Lead Scraper first.
                  </p>
                ) : (
                  <>
                    <select
                      aria-label="Scrape run"
                      value={scrapeRunId}
                      onChange={(e) => setScrapeRunId(e.target.value)}
                      className={FIELD_SELECT}
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
                        className={FIELD_CHECK}
                      />
                      <span className="text-label text-on-surface">Only leads not contacted yet</span>
                    </label>
                    <p className="text-caption text-on-surface-variant">
                      New contacts are capped per day to protect your WhatsApp number — the rest go out on the following days.
                    </p>
                  </>
                )}
              </div>
            )}

            {audienceType === "FILTERED" && products && products.length > 0 && (
              <fieldset className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                <legend className="text-caption text-on-surface-variant">Contacts who own any of these products</legend>
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
                      className={FIELD_CHECK}
                    />
                    <span className="text-label text-on-surface">{p.name}</span>
                  </label>
                ))}
                {selectedProductIds.length === 0 && (
                  <p className="text-caption text-warning">Select at least one product</p>
                )}
              </fieldset>
            )}

            {audienceType === "FILTERED" && (!products || products.length === 0) && (
              <p className="text-caption text-on-surface-variant pl-2">
                No products created yet. Go to Settings → Products to create one.
              </p>
            )}
          </div>
          )}
          </FormSection>

          {/* Steps */}
          <FormSection step={3} title={`Messages (${steps.length})`} id="seq-section-messages">
          <div>
            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step._key}>
                  {/* Delay indicator; the first step's only matters when a trigger starts it */}
                  {(index > 0 || joinMode === "AUTO") && (
                    <div className={cn("flex items-center gap-2 pl-6", index > 0 ? "py-2" : "pb-2")}>
                      {index > 0 && <ArrowDown className="h-4 w-4 text-on-surface-variant/40" />}
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-on-surface-variant" aria-hidden />
                        <label htmlFor={`seq-delay-${step._key}`} className="text-caption text-on-surface-variant">
                          {index === 0 ? "After the trigger, wait" : "Wait"}
                        </label>
                        <select
                          id={`seq-delay-${step._key}`}
                          value={step.delayMinutes}
                          onChange={(e) => updateStep(index, "delayMinutes", parseInt(e.target.value))}
                          className={FIELD_SMALL}
                        >
                          {DELAY_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step card */}
                  <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-3">
                    <div className="mb-2 flex items-center gap-2">
                      {/* Number badge (no drag handle: steps can't be reordered, conditions point at positions) */}
                      <span
                        aria-hidden
                        className="grid size-6 shrink-0 place-items-center rounded-full bg-surface-container-high text-caption font-semibold tabular-nums text-on-surface"
                      >
                        {index + 1}
                      </span>
                      <input
                        value={step.name || ""}
                        onChange={(e) => updateStep(index, "name", e.target.value)}
                        placeholder={`Message ${index + 1} name (optional)`}
                        aria-label={`Message ${index + 1} name`}
                        className="flex-1 rounded-lg border-0 bg-transparent px-1.5 py-0.5 text-label font-medium text-on-surface placeholder:font-normal placeholder:text-placeholder outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      />
                      {steps.length > 1 && (
                        <IconButton size="xs" variant="danger"
                          onClick={() => removeStep(index)} aria-label={`Delete message ${index + 1}`} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </IconButton>
                      )}
                    </div>
                    <textarea
                      value={step.messageBody || ""}
                      onChange={(e) => updateStep(index, "messageBody", e.target.value)}
                      placeholder="Write the message…"
                      aria-label={`Message ${index + 1} text`}
                      rows={3}
                      maxLength={4096}
                      className={cn(FIELD_INPUT, "mt-0 resize-y")}
                    />

                    {/* AI rewrite + conditions */}
                    <div className="mt-2 flex items-center gap-4">
                      <RewriteMenu
                        message={step.messageBody || ""}
                        goal={aiGoal ?? (description || name || undefined)}
                        onRewrite={(next) => updateStep(index, "messageBody", next)}
                      />
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => addCondition(index)}
                          className="flex items-center gap-1 text-caption text-tertiary hover:text-tertiary/80 transition-colors"
                        >
                          <GitBranch className="h-3 w-3" /> Add condition
                        </button>
                      )}
                    </div>

                    {/* Conditions */}
                    {step.conditions && step.conditions.length > 0 && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-tertiary/30">
                        <p className="text-caption font-medium text-tertiary">
                          If the contact replies with a keyword
                        </p>
                        {step.conditions.map((cond, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <input
                              value={cond.keyword}
                              onChange={(e) => updateCondition(index, ci, "keyword", e.target.value)}
                              placeholder="keyword"
                              aria-label={`Message ${index + 1}, condition ${ci + 1} keyword`}
                              className={cn(FIELD_SMALL, "flex-1")}
                            />
                            <span className="text-caption text-on-surface-variant">→ go to</span>
                            <select
                              aria-label={`Message ${index + 1}, condition ${ci + 1}: go to`}
                              value={cond.goToStepOrder}
                              onChange={(e) => updateCondition(index, ci, "goToStepOrder", parseInt(e.target.value))}
                              className={FIELD_SMALL}
                            >
                              {steps.map((_, si) => (
                                <option key={si} value={si}>Message {si + 1}</option>
                              ))}
                            </select>
                            <IconButton size="xs" variant="danger"
                              onClick={() => removeCondition(index, ci)} aria-label={`Remove condition ${ci + 1}`}>
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
              type="button"
              onClick={addStep}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-outline-variant py-2.5 text-label font-medium text-primary outline-none transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:ring-2 focus-visible:ring-focus"
            >
              <Plus className="h-3.5 w-3.5" /> Add message
            </button>
          </div>
          </FormSection>
        </div>

        {/* What the contact sees, step by step */}
        {/* Wide enough for the phone mock, so it never scrolls sideways */}
        <div
          aria-label="Preview"
          role="region"
          className="hidden lg:flex w-[360px] shrink-0 flex-col items-center overflow-y-auto overflow-x-hidden [scrollbar-width:none] border-l border-outline-variant bg-surface-container-low px-5 py-4"
        >
          <p className="mb-3 self-stretch text-label font-medium text-on-surface-variant">Preview</p>
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

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
          {blockedReason && (
            <p role="status" className="mr-auto text-label text-warning">
              {blockedReason}
            </p>
          )}
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Creating…" : joinMode === "AUTO" ? "Create & turn on" : "Create sequence"}
          </Button>
        </div>
      </>
  );
}
