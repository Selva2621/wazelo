"use client";

import { Fragment, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ClipboardList,
  Clock,
  FileText,
  Globe,
  Images,
  Lock,
  Power,
  Sparkles,
  Tag,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { useOrgSettings } from "@/hooks/use-settings";
import { useSubscription } from "@/hooks/use-billing";
import { useAutomationRules, automationKeys } from "@/hooks/use-automation";
import { useChatbotFlows, chatbotKeys } from "@/hooks/use-chatbot";
import { usePipelines } from "@/hooks/use-deals";
import { automationApi } from "@/lib/api/automation";
import { chatbotApi } from "@/lib/api/chatbot";
import { getAutomationPresets, type AutomationPreset } from "@/lib/constants/automation-presets";
import { buildPresetNodes, getChatbotPresets, type ChatbotPreset } from "@/lib/constants/chatbot-presets";
import { DEFAULT_PRESET_PROFILE, REPLY_TIME_OPTIONS } from "@/lib/constants/preset-profile";
import { buildFreelancerIntro, INTRO_STYLES, type IntroStyle } from "@/lib/constants/freelancer-pitch";
import type { CreateAutomationRuleRequest } from "@/lib/types/automation";
import type { Pipeline } from "@/lib/types/deals";

/** Which recipes the assistant turns on, in order; the welcome rule is left out because the chatbot greets */
const FREELANCER_PACK = ["freelancer-qualifier", "freelancer-portfolio", "freelancer-pricing", "freelancer-no-reply", "freelancer-proposal", "freelancer-won"];
const TEAM_PACK = ["team-qualifier", "team-pricing", "team-no-reply", "team-website-lead"];

const ITEM_ICONS: Record<string, LucideIcon> = {
  "freelancer-qualifier": ClipboardList,
  "freelancer-portfolio": Images,
  "freelancer-pricing": Tag,
  "freelancer-no-reply": Clock,
  "freelancer-proposal": FileText,
  "freelancer-won": Trophy,
  "team-qualifier": ClipboardList,
  "team-pricing": Tag,
  "team-no-reply": Clock,
  "team-website-lead": Globe,
};

interface PackItem {
  id: string;
  label: string;
  hint: string;
  /** Why it can't be turned on yet */
  unavailable?: string;
  run: () => Promise<void>;
}

/** The default pipeline's stage for a recipe that waits on a deal stage */
function stageFor(presetId: string, pipelines: Pipeline[] | undefined): string | undefined {
  const pipeline = pipelines?.find((p) => p.isDefault) ?? pipelines?.[0];
  if (!pipeline) return undefined;
  if (presetId.endsWith("-won")) return pipeline.stages.find((s) => s.isWonStage)?.id;
  if (presetId.endsWith("-proposal")) return pipeline.stages.find((s) => /proposal/i.test(s.name))?.id;
  return undefined;
}

/**
 * Whether the "turn on your assistant" step applies (admins only; the rules and flows
 * it reads are off-limits to other roles) and whether it is already done.
 */
export function useAssistantStatus() {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const { data: rules, isLoading: rulesLoading } = useAutomationRules({ limit: 1 }, { enabled: isAdmin });
  const { data: flows, isLoading: flowsLoading } = useChatbotFlows({ enabled: isAdmin });
  return {
    applicable: isAdmin,
    loading: isAdmin && (rulesLoading || flowsLoading),
    done: (rules?.total ?? 0) > 0 || (flows?.length ?? 0) > 0,
  };
}

/** Names of the rules and flows the assistant creates; how its pieces are found again later */
function assistantNames() {
  const ids = new Set([...FREELANCER_PACK, ...TEAM_PACK]);
  const rules = [...getAutomationPresets("FREELANCER"), ...getAutomationPresets("TEAM")]
    .filter((p) => ids.has(p.id))
    .map((p) => p.values.name)
    .filter((n): n is string => !!n);
  const flows = [...getChatbotPresets("FREELANCER", false), ...getChatbotPresets("TEAM", false)]
    .filter((p) => ids.has(p.id))
    .map((p) => p.flow.name);
  return { rules: new Set(rules), flows: new Set(flows) };
}

/**
 * The assistant's chatbot flows and automation rules, with one switch for all of them.
 * Only finds pieces still carrying the names it gave them.
 */
export function useAssistantControls(enabled: boolean) {
  const queryClient = useQueryClient();
  const { data: rulesData } = useAutomationRules({ limit: 100 }, { enabled });
  const { data: flowsData } = useChatbotFlows({ enabled });
  const [busy, setBusy] = useState(false);

  const names = assistantNames();
  const rules = (rulesData?.data ?? []).filter((r) => names.rules.has(r.name));
  const flows = (flowsData ?? []).filter((f) => names.flows.has(f.name));
  const runningCount = rules.filter((r) => r.status === "ACTIVE").length + flows.filter((f) => f.isActive).length;

  async function setOn(on: boolean) {
    setBusy(true);
    try {
      await Promise.all([
        ...rules
          .filter((r) => (r.status === "ACTIVE") !== on)
          .map((r) => (on ? automationApi.enable(r.id) : automationApi.disable(r.id))),
        ...flows
          .filter((f) => f.isActive !== on)
          .map((f) => (on ? chatbotApi.activateFlow(f.id) : chatbotApi.deactivateFlow(f.id))),
      ]);
      toast.success(on ? "Assistant turned on" : "Assistant turned off. Nothing is sent automatically now.");
    } catch {
      toast.error(on ? "Couldn't turn everything on" : "Couldn't turn everything off");
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: automationKeys.all }),
        queryClient.invalidateQueries({ queryKey: chatbotKeys.all }),
      ]);
      setBusy(false);
    }
  }

  return {
    exists: rules.length + flows.length > 0,
    isOn: runningCount > 0,
    runningCount,
    total: rules.length + flows.length,
    busy,
    turnOn: () => setOn(true),
    turnOff: () => setOn(false),
  };
}

/**
 * Switch for the assistant: a card on the dashboard once the setup card is gone,
 * or `inline` as one line inside the setup card.
 */
export function AssistantSwitch({ className, inline }: { className?: string; inline?: boolean }) {
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  const controls = useAssistantControls(isAdmin);
  if (!isAdmin || !controls.exists) return null;

  if (inline) {
    return (
      <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-body", className)}>
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-lg",
            controls.isOn ? "bg-primary/10 text-primary" : "bg-surface-container text-on-surface-variant",
          )}
        >
          <Sparkles className="h-4 w-4" />
        </span>
        <p className="min-w-0 flex-1 text-on-surface-variant">
          {controls.isOn ? (
            <>
              Your assistant is on:{" "}
              <span className="font-semibold text-on-surface">
                {controls.runningCount} of {controls.total} running
              </span>
              , replying to enquiries and following up for you
            </>
          ) : (
            <>
              Your assistant is <span className="font-semibold text-on-surface">off</span>. New enquiries wait for you to reply
            </>
          )}
        </p>
        <Link href="/automation" className="text-label font-semibold text-primary hover:underline">
          Edit
        </Link>
        <Button
          size="sm"
          variant={controls.isOn ? "ghost" : "primary"}
          loading={controls.busy}
          onClick={controls.isOn ? controls.turnOff : controls.turnOn}
        >
          <Power className="h-3.5 w-3.5 mr-1.5" />
          {controls.isOn ? "Turn off" : "Turn on"}
        </Button>
      </div>
    );
  }

  return (
    <section
      aria-label="Your assistant"
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-3xl border border-outline-variant bg-surface-container-lowest px-5 py-3",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-xl",
          controls.isOn ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant",
        )}
      >
        <Sparkles className="h-4.5 w-4.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-on-surface">
          {controls.isOn ? "Your assistant is on" : "Your assistant is off"}
        </p>
        <p className="text-label text-on-surface-variant">
          {controls.isOn
            ? `${controls.runningCount} of ${controls.total} running: replying to enquiries and following up for you`
            : "New enquiries wait for you to reply"}
        </p>
      </div>
      <Link href="/automation" className="text-label font-medium text-primary hover:underline">
        Edit
      </Link>
      <Button
        size="sm"
        variant={controls.isOn ? "secondary" : "primary"}
        loading={controls.busy}
        onClick={controls.isOn ? controls.turnOff : controls.turnOn}
      >
        <Power className="h-3.5 w-3.5 mr-1.5" />
        {controls.isOn ? "Turn off" : "Turn on"}
      </Button>
    </section>
  );
}

/** The assistant step of "Get set up": a few details, a preview, and one button. */
export function AssistantSetup({ locked, onDone }: { locked?: boolean; onDone?: (turnedOn: string[]) => void }) {
  const queryClient = useQueryClient();
  const { data: org } = useOrgSettings();
  const { data: sub } = useSubscription();
  const { data: pipelines } = usePipelines();

  const firstName = useAuthStore((s) => s.user?.firstName);
  const [replyTime, setReplyTime] = useState(DEFAULT_PRESET_PROFILE.replyTime);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  // null = the picked style's intro, which follows the portfolio link as it's typed
  const [customIntro, setCustomIntro] = useState<string | null>(null);
  const [introStyle, setIntroStyle] = useState<IntroStyle>("friendly");
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());
  const [running, setRunning] = useState(false);

  const isFreelancer = org?.orgType === "FREELANCER";
  const automationOn = sub?.subscription?.plan?.automationEnabled ?? true;
  const introDetails = {
    name: firstName,
    freelancerTypes: org?.freelancerTypes,
    service: org?.freelancerServiceLabel ?? org?.freelancerService,
    portfolioUrl: portfolioUrl.trim() || undefined,
    style: introStyle,
  };
  const suggestedIntro = buildFreelancerIntro(introDetails);
  const intro = customIntro ?? suggestedIntro;
  const profile = {
    replyTime,
    portfolioUrl: portfolioUrl.trim() || undefined,
    introDetails,
    intro: isFreelancer ? intro : undefined,
  };
  const automationPresets = getAutomationPresets(org?.orgType, profile);
  const chatbotPresets = getChatbotPresets(org?.orgType, false, profile);

  const flowItem = (preset: ChatbotPreset, unavailable?: string): PackItem => ({
    id: preset.id,
    label: preset.title,
    hint: "Chatbot",
    unavailable,
    run: async () => {
      const flow = await chatbotApi.createFlow(preset.flow);
      if (preset.steps?.length) await chatbotApi.saveNodes(flow.id, { nodes: buildPresetNodes(preset.steps) });
      await chatbotApi.activateFlow(flow.id);
    },
  });

  const ruleItem = (preset: AutomationPreset, stageId: string | undefined, unavailable?: string): PackItem => ({
    id: preset.id,
    label: preset.title,
    hint: "Automation",
    unavailable,
    // Rules are created switched on
    run: async () => {
      const values = {
        ...preset.values,
        triggerConfig: { ...preset.values.triggerConfig, ...(stageId && { stageId }) },
      };
      await automationApi.create(values as CreateAutomationRuleRequest);
    },
  });

  const items: PackItem[] = (isFreelancer ? FREELANCER_PACK : TEAM_PACK).flatMap((id): PackItem[] => {
    const flowPreset = chatbotPresets.find((p) => p.id === id);
    if (flowPreset) {
      const needsLink = id === "freelancer-portfolio" && !profile.portfolioUrl;
      return [flowItem(flowPreset, needsLink ? "Add your portfolio link" : undefined)];
    }
    const rulePreset = automationPresets.find((p) => p.id === id);
    if (!rulePreset) return [];
    const needsStage = rulePreset.values.triggerType === "DEAL_STAGE_CHANGED";
    const stageId = needsStage ? stageFor(id, pipelines) : undefined;
    const unavailable = !automationOn
      ? "Not in your plan"
      : needsStage && !stageId
        ? "No matching deal stage"
        : undefined;
    return [ruleItem(rulePreset, stageId, unavailable)];
  });

  const isChecked = (item: PackItem) => !item.unavailable && !unchecked.has(item.id);
  const toggle = (id: string) =>
    setUnchecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectedCount = items.filter(isChecked).length;

  async function setUp() {
    setRunning(true);
    const turnedOn: string[] = [];
    const failed: string[] = [];
    for (const item of items.filter(isChecked)) {
      try {
        await item.run();
        turnedOn.push(item.label);
      } catch {
        failed.push(item.label);
      }
    }
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: automationKeys.all }),
      queryClient.invalidateQueries({ queryKey: chatbotKeys.all }),
    ]);
    setRunning(false);
    if (failed.length) toast.error(`Couldn't set up: ${failed.join(", ")}`);
    if (turnedOn.length) {
      toast.success(`Assistant on: ${turnedOn.length} ${turnedOn.length === 1 ? "thing" : "things"} running`);
      onDone?.(turnedOn);
    }
  }

  if (locked) {
    return (
      <p className="flex items-center gap-2 text-body text-on-surface-variant">
        <Lock className="h-4 w-4 shrink-0" />
        Connect WhatsApp first. Your assistant replies from that number.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="min-w-0 space-y-5">
        {/* Reply time: drives the promise in every message */}
        <div>
          <p id="reply-time-label" className="text-label font-medium text-on-surface-variant mb-2">
            You usually reply
          </p>
          <div role="radiogroup" aria-labelledby="reply-time-label" className="inline-flex flex-wrap gap-1 rounded-full bg-surface-container p-1">
            {REPLY_TIME_OPTIONS.map((o) => {
              const active = replyTime === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setReplyTime(o.value)}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-label font-medium transition-colors",
                    active
                      ? "bg-surface-container-lowest text-on-surface shadow-sm"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {isFreelancer && (
          <div className="max-w-md">
            <label htmlFor="assistant-portfolio" className="text-label font-medium text-on-surface-variant">
              Portfolio link <span className="font-normal">(optional)</span>
            </label>
            <Input
              id="assistant-portfolio"
              type="url"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
              placeholder="https://yourname.com/work"
              className="mt-1.5"
            />
          </div>
        )}

        {/* The first impression: who you are and how you help, editable */}
        {isFreelancer && (
          <div>
            <label htmlFor="assistant-intro" className="text-label font-medium text-on-surface-variant">
              First message to new enquiries
            </label>
            {/* Picking a style rewrites the message; typing edits it */}
            <div role="radiogroup" aria-label="Message style" className="mt-2 flex flex-wrap gap-1.5">
              {INTRO_STYLES.map((s) => {
                const active = customIntro === null && introStyle === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      setIntroStyle(s.value);
                      setCustomIntro(null);
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1 text-label font-medium transition-colors",
                      active
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant/40 text-on-surface-variant hover:border-primary/40 hover:text-on-surface",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
              {customIntro !== null && (
                <span className="self-center rounded-full bg-surface-container px-3 py-1 text-label font-medium text-on-surface-variant">
                  Edited
                </span>
              )}
            </div>
            <textarea
              id="assistant-intro"
              value={intro}
              onChange={(e) => setCustomIntro(e.target.value)}
              rows={8}
              maxLength={1000}
              className="mt-1.5 w-full resize-y rounded-2xl border border-outline-variant/30 bg-surface-container-lowest px-3 py-2.5 text-body text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <p className="mt-1 text-caption text-on-surface-variant">
              *Stars* make text bold on WhatsApp. The chatbot asks its three questions right after.
            </p>
          </div>
        )}

        {/* What gets turned on: tiles toggle on click */}
        <div>
          <p className="text-label font-medium text-on-surface-variant mb-2">Turns on</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((item) => {
              const Icon = ITEM_ICONS[item.id] ?? Check;
              const checked = isChecked(item);
              return (
                <button
                  key={item.id}
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  disabled={!!item.unavailable || running}
                  onClick={() => toggle(item.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.99]",
                    checked
                      ? "border-primary/40 bg-primary/5"
                      : "border-outline-variant/30 bg-surface-container-lowest hover:border-outline-variant",
                    item.unavailable && "opacity-55 cursor-not-allowed active:scale-100",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-xl",
                      checked ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface-variant",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-medium text-on-surface">{item.label}</span>
                    <span className="block truncate text-caption text-on-surface-variant">
                      {item.unavailable ?? item.hint}
                    </span>
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border transition-colors",
                      checked ? "border-primary bg-primary text-on-primary" : "border-outline-variant",
                    )}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={setUp} loading={running} disabled={selectedCount === 0}>
            Turn on {selectedCount} {selectedCount === 1 ? "thing" : "things"}
          </Button>
          <p className="text-caption text-on-surface-variant">Everything stays editable on the Chatbot and Automation pages.</p>
        </div>
      </div>

      {/* Live preview of the chatbot, updates with the reply time */}
      <ChatPreview isFreelancer={isFreelancer} replyTime={replyTime} intro={intro} />
    </div>
  );
}

/** WhatsApp shows *text* as bold */
function whatsAppBold(text: string) {
  return text.split(/(\*[^*\n]+\*)/g).map((part, i) =>
    part.length > 2 && part.startsWith("*") && part.endsWith("*") ? (
      <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

/** What a new enquiry sees, in WhatsApp's own colours */
function ChatPreview({ isFreelancer, replyTime, intro }: { isFreelancer: boolean; replyTime: string; intro: string }) {
  const lines: { from: "them" | "you"; text: string }[] = isFreelancer
    ? [
        { from: "them", text: "Hi, I saw your work. Can you help my bakery?" },
        { from: "you", text: intro },
        { from: "you", text: "What do you need help with?" },
        { from: "them", text: "A simple site with an order form" },
        { from: "you", text: `Thanks! I'll come back with a quote ${replyTime}.` },
      ]
    : [
        { from: "them", text: "Hi, do you deliver to Anna Nagar?" },
        { from: "you", text: "Hi! Thanks for contacting us. May I know your name?" },
        { from: "them", text: "Priya" },
        { from: "you", text: "Thanks Priya! Our team will get back to you shortly." },
      ];

  return (
    <figure className="hidden lg:block" aria-label="Preview of the chatbot on WhatsApp">
      <div className="wa-phone overflow-hidden rounded-2xl border border-outline-variant/30">
        <div className="flex items-center gap-2 bg-[var(--wa-header)] px-3 py-2 text-[var(--wa-on-header)]">
          <span className="grid size-7 place-items-center rounded-full bg-primary text-caption font-semibold text-on-primary">
            {isFreelancer ? "You" : "Us"}
          </span>
          <span className="text-label font-semibold">Your WhatsApp</span>
        </div>
        <div className="wa-wallpaper flex flex-col gap-1.5 p-2.5">
          {lines.map((line, i) => (
            <p
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-wrap break-words rounded-lg px-2 py-1.5 text-caption text-[var(--wa-text)] shadow-sm",
                line.from === "them"
                  ? "self-start rounded-tl-sm bg-[var(--wa-in)]"
                  : "self-end rounded-tr-sm bg-[var(--wa-out)]",
              )}
            >
              {whatsAppBold(line.text)}
            </p>
          ))}
        </div>
      </div>
      <figcaption className="mt-2 text-center text-caption text-on-surface-variant">
        Replies while you&apos;re busy
      </figcaption>
    </figure>
  );
}
