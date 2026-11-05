"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X,
  Check,
  MessageCircle,
  Power,
  Sparkles,
  Lock,
  ArrowRight,
  Package,
  Globe,
  Mail,
  FileText,
  Users,
  BookOpen,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetupChecklist, type ChecklistItem } from "@/hooks/use-setup-checklist";
import { useWhatsAppSession } from "@/hooks/use-whatsapp";
import { useOrgSettings } from "@/hooks/use-settings";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";
import { AssistantSetup, useAssistantControls, useAssistantStatus } from "@/components/dashboard/assistant-setup";

/** The spotlight's main button per step (the hook's actionLabel is the short fallback) */
const STEP_CTA: Record<string, string> = {
  whatsapp: "Connect WhatsApp",
  template: "Create a template",
  knowledge: "Add knowledge",
  team: "Invite teammates",
  assistant: "Set up assistant",
  widget: "Add website chat",
  email: "Connect email",
  hours: "Set working hours",
};

/** One-word names under the path dots */
const STEP_SHORT: Record<string, string> = {
  whatsapp: "WhatsApp",
  template: "Template",
  knowledge: "Teach AI",
  team: "Team",
  assistant: "Assistant",
  widget: "Web chat",
  email: "Email",
  hours: "Hours",
};

/* ── Progress ring (header) ─────────────────────── */
function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--outline-variant)" strokeWidth={stroke} strokeOpacity="0.25" />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={false}
        animate={{ strokeDashoffset: circ - (pct / 100) * circ }}
        transition={{ duration: 0.8, ease: [0.2, 0, 0, 1] }}
      />
    </svg>
  );
}

/* ── Looping mini-illustrations: what each step does ── */
function Scene({ id, still }: { id: string; still: boolean }) {
  // Loops pause for people who asked for less motion; the scene still explains the step
  const loop = (duration: number, delay = 0) =>
    still ? { duration: 0 } : { duration, delay, repeat: Infinity, ease: "easeInOut" as const };

  if (id === "whatsapp") {
    return (
      <div className="relative flex h-full items-center justify-center">
        <div className="relative h-24 w-14 rounded-xl border-2 border-on-surface/70 bg-surface p-1.5">
          <div className="grid h-full grid-cols-3 gap-0.5">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.span
                key={i}
                className="rounded-[2px] bg-on-surface/70"
                animate={still ? { opacity: 0.8 } : { opacity: [0.2, 0.9, 0.2] }}
                transition={loop(1.6, (i % 4) * 0.15)}
              />
            ))}
          </div>
          <motion.span
            className="absolute -right-3 -top-3 grid size-7 place-items-center rounded-full bg-[#25D366] text-white shadow-sm"
            animate={still ? { scale: 1 } : { scale: [0, 0, 1.15, 1, 1, 0] }}
            transition={{ ...loop(3.2), times: [0, 0.45, 0.55, 0.62, 0.9, 1] }}
          >
            <Check className="h-4 w-4" />
          </motion.span>
        </div>
      </div>
    );
  }

  if (id === "template") {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-44 rounded-2xl rounded-tl-sm bg-surface p-3 shadow-sm ring-1 ring-outline-variant/40">
          <div className="flex items-center gap-1.5 text-caption font-medium text-on-surface-variant">
            <FileText className="h-3.5 w-3.5 text-primary" /> welcome_offer
          </div>
          <motion.p
            className="mt-1.5 overflow-hidden whitespace-nowrap text-label text-on-surface"
            animate={still ? { width: "100%" } : { width: ["0%", "100%", "100%", "0%"] }}
            transition={{ ...loop(4.2), times: [0, 0.45, 0.85, 1] }}
          >
            Hi {"{{name}}"}, 20% off this week!
          </motion.p>
        </div>
      </div>
    );
  }

  if (id === "knowledge") {
    const sources = [Globe, FileText, BookOpen];
    return (
      <div className="relative flex h-full items-center justify-center gap-6">
        <div className="flex flex-col gap-1.5">
          {sources.map((Icon, i) => (
            <motion.span
              key={i}
              className="grid size-7 place-items-center rounded-lg bg-surface text-on-surface-variant ring-1 ring-outline-variant/50"
              animate={still ? { x: 0 } : { x: [0, 26, 26, 0], opacity: [1, 0, 0, 1] }}
              transition={{ ...loop(3, i * 0.35), times: [0, 0.4, 0.9, 1] }}
            >
              <Icon className="h-3.5 w-3.5" />
            </motion.span>
          ))}
        </div>
        <motion.span
          className="grid size-14 place-items-center rounded-full bg-primary text-on-primary shadow-sm"
          animate={still ? { scale: 1 } : { scale: [1, 1.12, 1] }}
          transition={loop(1.5)}
        >
          <Sparkles className="h-6 w-6" />
        </motion.span>
      </div>
    );
  }

  if (id === "contacts" || id === "team") {
    const isTeam = id === "team";
    return (
      <div className="flex h-full items-center justify-center">
        <div className="w-44 space-y-1.5">
          {["Ravi K", "Meena S", "Arun P"].map((name, i) => (
            <motion.div
              key={name}
              className="flex items-center gap-2 rounded-lg bg-surface px-2 py-1.5 ring-1 ring-outline-variant/40"
              animate={still ? { opacity: 1, x: 0 } : { opacity: [0, 1, 1, 0], x: [-14, 0, 0, 0] }}
              transition={{ ...loop(3.6, i * 0.25), times: [0, 0.18, 0.85, 1] }}
            >
              <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                {name[0]}
              </span>
              <span className="text-caption text-on-surface">{name}</span>
              {isTeam ? (
                <Users className="ml-auto h-3 w-3 text-on-surface-variant" />
              ) : (
                <Search className="ml-auto h-3 w-3 text-on-surface-variant" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    );
  }

  if (id === "widget") {
    // A website with the chat bubble popping open
    return (
      <div className="flex h-full items-center justify-center">
        <div className="relative h-24 w-40 overflow-hidden rounded-lg bg-surface ring-1 ring-outline-variant/50">
          <div className="flex gap-1 border-b border-outline-variant/40 px-2 py-1.5">
            {[0, 1, 2].map((i) => (
              <span key={i} className="size-1.5 rounded-full bg-outline-variant" />
            ))}
          </div>
          <div className="space-y-1 p-2">
            <span className="block h-1.5 w-20 rounded bg-outline-variant/50" />
            <span className="block h-1.5 w-14 rounded bg-outline-variant/40" />
          </div>
          <motion.span
            className="absolute bottom-7 right-2 rounded-xl rounded-br-sm bg-primary px-2 py-1 text-[10px] text-on-primary"
            animate={still ? { opacity: 1, y: 0 } : { opacity: [0, 0, 1, 1, 0], y: [6, 6, 0, 0, 0] }}
            transition={{ ...loop(3.4), times: [0, 0.3, 0.4, 0.88, 1] }}
          >
            Hi! How can I help?
          </motion.span>
          <motion.span
            className="absolute bottom-1.5 right-2 grid size-5 place-items-center rounded-full bg-primary text-on-primary"
            animate={still ? { scale: 1 } : { scale: [1, 1.15, 1] }}
            transition={loop(1.7)}
          >
            <MessageCircle className="h-3 w-3" />
          </motion.span>
        </div>
      </div>
    );
  }

  if (id === "email") {
    // An email flying from you to the inbox, landing with a check
    return (
      <div className="relative flex h-full items-center justify-center gap-10">
        <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-caption font-semibold text-primary">You</span>
        <motion.span
          className="absolute left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-lg bg-surface text-primary shadow-sm ring-1 ring-outline-variant/50"
          animate={still ? { x: 0 } : { x: [-40, 40, 40], opacity: [0, 1, 0] }}
          transition={{ ...loop(2.4), times: [0, 0.7, 1] }}
        >
          <Mail className="h-4 w-4" />
        </motion.span>
        <motion.span
          className="grid size-9 place-items-center rounded-full bg-success text-white"
          animate={still ? { scale: 1 } : { scale: [0.85, 0.85, 1.1, 1] }}
          transition={{ ...loop(2.4), times: [0, 0.65, 0.8, 1] }}
        >
          <Check className="h-4 w-4" />
        </motion.span>
      </div>
    );
  }

  if (id === "products") {
    // Boxes dropping onto a shelf
    return (
      <div className="flex h-full items-end justify-center gap-2 pb-7">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="grid size-9 place-items-center rounded-lg bg-surface text-primary shadow-sm ring-1 ring-outline-variant/50"
            animate={still ? { y: 0, opacity: 1 } : { y: [-30, 0, 0, 0], opacity: [0, 1, 1, 0] }}
            transition={{ ...loop(3.2, i * 0.3), times: [0, 0.2, 0.85, 1] }}
          >
            <Package className="h-4 w-4" />
          </motion.span>
        ))}
      </div>
    );
  }

  if (id === "hours") {
    // A clock hand going round, with an "away" note
    return (
      <div className="flex h-full items-center justify-center gap-4">
        <div className="relative size-16 rounded-full bg-surface ring-2 ring-on-surface/60">
          <motion.span
            className="absolute left-1/2 top-1/2 h-6 w-0.5 origin-bottom -translate-x-1/2 -translate-y-full rounded bg-primary"
            animate={still ? { rotate: 45 } : { rotate: [0, 360] }}
            transition={still ? { duration: 0 } : { duration: 4, repeat: Infinity, ease: "linear" }}
          />
          <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-on-surface" />
        </div>
        <span className="rounded-xl bg-surface px-2 py-1 text-[10px] text-on-surface-variant ring-1 ring-outline-variant/40">
          Back at 10 am
        </span>
      </div>
    );
  }

  // Assistant: a customer asks, the AI answers
  return (
    <div className="flex h-full flex-col justify-center gap-1.5 px-6">
      <motion.span
        className="max-w-[70%] self-start rounded-2xl rounded-tl-sm bg-surface px-2.5 py-1.5 text-caption text-on-surface ring-1 ring-outline-variant/40"
        animate={still ? { opacity: 1 } : { opacity: [0, 1, 1, 0] }}
        transition={{ ...loop(4), times: [0, 0.12, 0.9, 1] }}
      >
        Price for a logo?
      </motion.span>
      <motion.span
        className="inline-flex max-w-[78%] items-center gap-1 self-end rounded-2xl rounded-tr-sm bg-primary px-2.5 py-1.5 text-caption text-on-primary"
        animate={still ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 0] }}
        transition={{ ...loop(4), times: [0, 0.35, 0.45, 0.9, 1] }}
      >
        <Sparkles className="h-3 w-3" /> Starts at ₹2,000. Want a call?
      </motion.span>
    </div>
  );
}

/* ── Path of dots (one group: main steps, or optional ones) ── */

type Spot = {
  id: string;
  title: string;
  short: string;
  description: ReactNode;
  done: boolean;
  optional: boolean;
  doneDetail: string;
  cta: ReactNode;
};

function StepPath({
  label,
  steps,
  offset,
  currentId,
  shownId,
  onPick,
  still,
  className,
}: {
  label: string;
  steps: Spot[];
  /** Position of the first dot in the whole flow (for "Step 7 of 10" labels) */
  offset: number;
  currentId?: string;
  shownId?: string;
  onPick: (s: Spot) => void;
  still: boolean;
  className?: string;
}) {
  const n = steps.length;
  if (n === 0) return null;
  const optional = steps[0].optional;
  return (
    <div className={cn("min-w-0", className)}>
      <p
        className={cn(
          "mb-2 text-center text-caption font-semibold uppercase tracking-widest",
          optional ? "text-on-surface-variant" : "text-primary",
        )}
      >
        {label}
      </p>
      <ol aria-label={label} className="relative flex items-start">
        {/* One link per pair of dots: green only when both ends are done (any order is fine) */}
        {steps.slice(0, -1).map((s, i) => (
          <span
            key={`link-${s.id}`}
            aria-hidden
            className={cn(
              "absolute top-4 h-0.5 overflow-hidden rounded-full max-sm:top-3.5",
              optional ? "border-t-2 border-dashed border-outline-variant/70" : "bg-outline-variant/50",
            )}
            style={{ left: `${((i + 0.5) / n) * 100}%`, width: `${100 / n}%` }}
          >
            <motion.span
              className="absolute -top-0.5 left-0 right-0 h-0.5 origin-left bg-success"
              initial={false}
              animate={{ scaleX: s.done && steps[i + 1].done ? 1 : 0 }}
              transition={still ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0, 0, 1] }}
            />
          </span>
        ))}
        {steps.map((s, i) => {
          const isShown = s.id === shownId;
          const isCurrent = s.id === currentId;
          const number = offset + i + 1;
          return (
            <li key={s.id} className="relative z-[1] flex min-w-0 flex-1 flex-col items-center">
              <button
                type="button"
                onClick={() => onPick(s)}
                aria-label={`Step ${number}: ${s.title}${s.optional ? " (optional)" : ""}${s.done ? ", done" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
                className="group flex min-h-11 w-full flex-col items-center gap-1 rounded-lg px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-focus"
              >
                <motion.span
                  className={cn(
                    "relative grid size-8 place-items-center rounded-full text-label font-semibold tabular-nums transition-colors max-sm:size-7 max-sm:text-caption",
                    s.done && "bg-success text-white",
                    !s.done && isCurrent && "bg-primary text-on-primary",
                    !s.done && !isCurrent && s.optional && "border-2 border-dashed border-outline-variant bg-surface-container-lowest text-on-surface-variant group-hover:border-primary/60",
                    !s.done && !isCurrent && !s.optional && "border border-outline-variant bg-surface-container-lowest text-on-surface-variant group-hover:border-primary/50",
                    isShown && "ring-4 ring-primary/20",
                  )}
                  // Check "pop" (keyframes need a timed animation, not a spring)
                  animate={s.done && !still ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                >
                  {s.done ? <Check className="h-4 w-4" /> : number}
                  {!s.done && isCurrent && !still && (
                    <motion.span
                      aria-hidden
                      className="absolute inset-0 rounded-full ring-2 ring-primary"
                      animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                      transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                </motion.span>
                <span
                  className={cn(
                    "max-w-full truncate text-caption",
                    isShown ? "font-semibold text-on-surface" : "text-on-surface-variant",
                    // Phones: only the shown step is named, to keep the row tidy
                    !isShown && "max-sm:sr-only",
                  )}
                >
                  {s.short}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* ── Desktop: every step as a vertical list beside the spotlight ── */
function StepList({
  groups,
  currentId,
  shownId,
  onPick,
  still,
}: {
  groups: { label: string; steps: Spot[]; offset: number }[];
  currentId?: string;
  shownId?: string;
  onPick: (s: Spot) => void;
  still: boolean;
}) {
  return (
    <nav aria-label="Setup steps" className="space-y-4">
      {groups
        .filter((g) => g.steps.length > 0)
        .map((g) => {
          const optional = g.steps[0].optional;
          return (
            <div key={g.label}>
              <p
                className={cn(
                  "mb-1 px-2 text-caption font-semibold uppercase tracking-widest",
                  optional ? "text-on-surface-variant" : "text-primary",
                )}
              >
                {g.label}
              </p>
              <ol aria-label={g.label}>
                {g.steps.map((s, i) => {
                  const next = g.steps[i + 1];
                  const isShown = s.id === shownId;
                  const isCurrent = s.id === currentId;
                  const number = g.offset + i + 1;
                  return (
                    <li key={s.id} className="relative">
                      {/* Link to the next dot: green once both ends are done */}
                      {next && (
                        <span
                          aria-hidden
                          className={cn(
                            "absolute left-[1.3rem] top-9 h-[calc(100%-1.75rem)] w-0.5 overflow-hidden",
                            optional ? "border-l-2 border-dashed border-outline-variant/70" : "bg-outline-variant/50",
                          )}
                        >
                          <motion.span
                            className="absolute -left-0.5 top-0 h-full w-0.5 origin-top bg-success"
                            initial={false}
                            animate={{ scaleY: s.done && next.done ? 1 : 0 }}
                            transition={still ? { duration: 0 } : { duration: 0.6, ease: [0.2, 0, 0, 1] }}
                          />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => onPick(s)}
                        aria-label={`Step ${number}: ${s.title}${s.optional ? " (optional)" : ""}${s.done ? ", done" : ""}`}
                        aria-current={isCurrent ? "step" : undefined}
                        className={cn(
                          "group flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus",
                          isShown ? "bg-primary/5" : "hover:bg-surface-container-low",
                        )}
                      >
                        <motion.span
                          className={cn(
                            "relative grid size-7 shrink-0 place-items-center rounded-full text-caption font-semibold tabular-nums transition-colors",
                            s.done && "bg-success text-white",
                            !s.done && isCurrent && "bg-primary text-on-primary",
                            !s.done && !isCurrent && s.optional && "border-2 border-dashed border-outline-variant bg-surface-container-lowest text-on-surface-variant group-hover:border-primary/60",
                            !s.done && !isCurrent && !s.optional && "border border-outline-variant bg-surface-container-lowest text-on-surface-variant group-hover:border-primary/50",
                          )}
                          animate={s.done && !still ? { scale: [1, 1.18, 1] } : { scale: 1 }}
                          transition={{ duration: 0.45, ease: "easeOut" }}
                        >
                          {s.done ? <Check className="h-3.5 w-3.5" /> : number}
                          {!s.done && isCurrent && !still && (
                            <motion.span
                              aria-hidden
                              className="absolute inset-0 rounded-full ring-2 ring-primary"
                              animate={{ scale: [1, 1.5], opacity: [0.6, 0] }}
                              transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                            />
                          )}
                        </motion.span>
                        <span
                          className={cn(
                            "min-w-0 flex-1 truncate text-label",
                            isShown ? "font-semibold text-on-surface" : s.done ? "text-on-surface-variant" : "text-on-surface",
                          )}
                        >
                          {s.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          );
        })}
    </nav>
  );
}

/* ── Main component ──────────────────────────────── */
/**
 * "Get set up": one flow with every step. The main steps come first; the optional ones
 * follow in the same flow, marked Optional (dashed), and never block "You're all set".
 * The spotlight shows the step to do now with a small animation of what it does and one
 * clear button; after the main steps it carries on to the optional ones. For admins the
 * last main step is the assistant (chatbot + automations) with its on/off switch.
 */
export function SetupChecklist({ className }: { className?: string } = {}) {
  const router = useRouter();
  const reduceMotion = useReducedMotion() ?? false;
  const { items } = useSetupChecklist();
  const assistant = useAssistantStatus();
  const controls = useAssistantControls(assistant.applicable);
  const { data: session } = useWhatsAppSession();
  const [connectOpen, setConnectOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [turnedOn, setTurnedOn] = useState(false);
  // A step picked on the path (otherwise the first unfinished one is shown). wasDone: an
  // unfinished step that then gets done hands the spotlight back to the next step.
  const [focus, setFocus] = useState<{ id: string; wasDone: boolean } | null>(null);
  // Phones: a finished checklist folds to its title row; the steps open on request
  const [stepsOpen, setStepsOpen] = useState(false);

  // What the assistant pack really turns on differs per workspace (see assistant-setup FREELANCER_PACK / TEAM_PACK)
  const { data: orgSettings } = useOrgSettings();
  const userOrgType = useAuthStore((s) => s.user?.orgType);
  const isFreelancer = (orgSettings?.orgType ?? userOrgType) === "FREELANCER";
  const assistantPitch = isFreelancer
    ? "Asks about new projects, shares your portfolio and chases proposals for you"
    : "Answers new enquiries, follows up and tags website leads for your team";

  const whatsappReady = items.find((i) => i.id === "whatsapp")?.done ?? false;
  const assistantDone = assistant.done || turnedOn;

  const go = (item: ChecklistItem) => (item.action === "connect-whatsapp" ? setConnectOpen(true) : router.push(item.href));

  const toSpot = (item: ChecklistItem): Spot => ({
    id: item.id,
    title: item.label,
    short:
      STEP_SHORT[item.id] ??
      (item.id === "contacts" ? (isFreelancer ? "Leads" : "Contacts") : item.id === "products" ? (isFreelancer ? "Services" : "Products") : item.label),
    description: item.description,
    done: item.done,
    optional: !!item.optional,
    doneDetail: item.id === "whatsapp" && session?.phoneNumber ? `Connected · ${session.phoneNumber}` : "Done",
    cta: (
      <Button size="lg" onClick={() => go(item)}>
        {STEP_CTA[item.id] ??
          (item.id === "contacts"
            ? isFreelancer ? "Find leads" : "Import contacts"
            : item.id === "products"
              ? isFreelancer ? "Add services" : "Add products"
              : item.actionLabel ?? "Open")}
        <ArrowRight className="ml-1.5 h-4 w-4" />
      </Button>
    ),
  });

  const main: Spot[] = [
    ...items.filter((i) => !i.optional).map(toSpot),
    ...(assistant.applicable
      ? [
          {
            id: "assistant",
            title: "Turn on your assistant",
            short: STEP_SHORT.assistant,
            description: whatsappReady ? (
              assistantPitch
            ) : (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> Connect WhatsApp first
              </span>
            ),
            done: assistantDone,
            optional: false,
            doneDetail: "Running",
            cta: (
              <Button size="lg" disabled={!whatsappReady} onClick={() => setAssistantOpen(true)}>
                <Sparkles className="mr-1.5 h-4 w-4" />
                {STEP_CTA.assistant}
              </Button>
            ),
          },
        ]
      : []),
  ];
  const optional: Spot[] = items.filter((i) => i.optional).map(toSpot);
  const steps = [...main, ...optional];

  const mainDone = main.filter((s) => s.done).length;
  const optionalDone = optional.filter((s) => s.done).length;
  const pct = main.length === 0 ? 100 : Math.round((mainDone / main.length) * 100);
  const allMainDone = mainDone === main.length;
  const allDone = allMainDone && optionalDone === optional.length;
  const folded = allDone && !stepsOpen;

  // The step to do now: the first unfinished main step, then the optional ones
  const currentId = (main.find((s) => !s.done) ?? optional.find((s) => !s.done))?.id;
  const focused = focus ? steps.find((s) => s.id === focus.id) : undefined;
  const focusId = focused && (focus?.wasDone || !focused.done) ? focused.id : null;
  const shown = steps.find((s) => s.id === (focusId ?? currentId));
  const shownIndex = shown ? steps.indexOf(shown) : -1;

  const pick = (s: Spot) => setFocus({ id: s.id, wasDone: s.done });

  /** "Skip": look at the next unfinished step after this one (nothing is saved) */
  function skip() {
    if (shownIndex < 0) return;
    const after = [...steps.slice(shownIndex + 1), ...steps.slice(0, shownIndex)].find((s) => !s.done);
    if (after) pick(after);
  }

  const eyebrow = shown
    ? `${shown.done ? "Done" : shown.optional ? "Optional" : shown.id === currentId ? "Next step" : "Step"} · ${shownIndex + 1} of ${steps.length}`
    : "";

  return (
    <>
      <section
        aria-labelledby="setup-title"
        data-tour="setup-checklist"
        className={cn("rounded-3xl border border-outline-variant bg-surface-container-lowest p-5", className)}
      >
        {/* Header */}
        <div className={cn("flex items-center justify-between gap-3", !folded && "mb-4")}>
          <div className="min-w-0">
            <h2 id="setup-title" className="text-title-sm font-semibold text-on-surface">
              {allMainDone ? "You're all set" : "Get set up"}
            </h2>
            <p className="text-label text-on-surface-variant">
              {mainDone} of {main.length} done
              {optional.length > 0 && (
                <span className="text-on-surface-variant/70">
                  {" · "}
                  {optionalDone} of {optional.length} optional
                </span>
              )}
            </p>
          </div>
          {allDone && (
            <button
              type="button"
              onClick={() => setStepsOpen((open) => !open)}
              aria-expanded={stepsOpen}
              aria-controls="setup-steps"
              className="ml-auto min-h-11 px-2 text-label font-semibold text-primary lg:hidden"
            >
              {stepsOpen ? "Hide steps" : "Show steps"}
            </button>
          )}
          <div className={cn("relative grid shrink-0 place-items-center", folded && "max-lg:hidden")}>
            <ProgressRing pct={pct} />
            <span className="absolute text-caption font-semibold tabular-nums text-on-surface">{pct}%</span>
          </div>
        </div>

        <div
          id="setup-steps"
          className={cn("lg:grid lg:grid-cols-[minmax(240px,300px)_1fr] lg:items-stretch lg:gap-5", folded && "max-lg:hidden")}
        >
          {/* Desktop: every step listed on the left */}
          <div className="max-lg:hidden">
            <StepList
              groups={[
                { label: "Main steps", steps: main, offset: 0 },
                { label: "Optional", steps: optional, offset: main.length },
              ]}
              currentId={currentId}
              shownId={shown?.id}
              onPick={pick}
              still={reduceMotion}
            />
          </div>
          <div className="flex min-w-0 flex-col">
          {/* Spotlight: the step to do now (main steps first, then the optional ones) */}
          {shown && !(allDone && !focusId) && (
            <div
              aria-live="polite"
              className={cn(
                "overflow-hidden rounded-2xl border bg-surface-container-low lg:flex-1",
                shown.optional ? "border-dashed border-outline-variant" : "border-outline-variant/50",
              )}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={shown.id}
                  initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
                  transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                  className="grid items-center gap-4 p-4 sm:grid-cols-[200px_1fr] sm:p-5 lg:h-full lg:grid-cols-1 lg:content-center lg:justify-items-center lg:gap-6 lg:p-8 lg:text-center"
                >
                  <div aria-hidden className="h-32 rounded-xl bg-primary/5 ring-1 ring-primary/10 max-sm:h-28 lg:h-48 lg:w-full lg:max-w-md">
                    <Scene id={shown.id} still={reduceMotion} />
                  </div>
                  <div className="min-w-0 lg:max-w-md">
                    <p
                      className={cn(
                        "text-caption font-semibold uppercase tracking-widest",
                        shown.optional && !shown.done ? "text-on-surface-variant" : "text-primary",
                      )}
                    >
                      {eyebrow}
                    </p>
                    <h3 className="mt-1 text-title-sm font-semibold text-on-surface">{shown.title}</h3>
                    <p className="mt-1 text-body text-on-surface-variant">{shown.done ? shown.doneDetail : shown.description}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-2 lg:justify-center">
                      {shown.done ? (
                        currentId && (
                          <Button size="lg" variant="secondary" onClick={() => setFocus(null)}>
                            Back to next step <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        )
                      ) : (
                        <>
                          {shown.cta}
                          {steps.filter((s) => !s.done).length > 1 && (
                            <button
                              type="button"
                              onClick={skip}
                              className="min-h-11 rounded-full px-3 text-label font-medium text-on-surface-variant outline-none hover:text-on-surface focus-visible:ring-2 focus-visible:ring-focus"
                            >
                              {shown.optional ? "Skip" : "Skip for now"}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Phones/tablets: every step as a row of dots under the spotlight */}
          <div className="mt-5 flex gap-3 max-md:flex-col max-md:gap-4 lg:hidden">
            <StepPath
              label="Main steps"
              steps={main}
              offset={0}
              currentId={currentId}
              shownId={shown?.id}
              onPick={pick}
              still={reduceMotion}
              className="flex-[3]"
            />
            {optional.length > 0 && (
              <>
                <span aria-hidden className="mt-7 w-px self-stretch bg-outline-variant/50 max-md:hidden" />
                <StepPath
                  label="Optional"
                  steps={optional}
                  offset={main.length}
                  currentId={currentId}
                  shownId={shown?.id}
                  onPick={pick}
                  still={reduceMotion}
                  className="flex-[2]"
                />
              </>
            )}
          </div>

          {/* Assistant on/off once it's set up */}
          {assistant.applicable && assistantDone && controls.exists && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-surface-container-low px-4 py-3">
              <p className="text-label text-on-surface-variant">
                <span className="font-semibold text-on-surface">Assistant: </span>
                {controls.isOn
                  ? `${controls.runningCount} of ${controls.total} running, replying and following up for you`
                  : "Off. New enquiries wait for you to reply"}
              </p>
              <div className="flex items-center gap-2">
                <Link href="/automation" className="text-label font-semibold text-primary hover:underline">
                  Configure
                </Link>
                <Button
                  size="sm"
                  variant={controls.isOn ? "ghost" : "primary"}
                  loading={controls.busy}
                  onClick={controls.isOn ? controls.turnOff : controls.turnOn}
                >
                  <Power className="mr-1.5 h-3.5 w-3.5" />
                  {controls.isOn ? "Turn off" : "Turn on"}
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </section>

      {/* Assistant setup is roomy (details, message, preview), so it opens on its own */}
      <Modal
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        aria-labelledby="assistant-setup-title"
        className="max-w-4xl max-h-[90vh] overflow-y-auto p-6"
      >
        {() => (
          <>
            <div className="mb-5 flex items-center gap-3 pr-8">
              <span className="grid size-10 place-items-center rounded-xl bg-primary text-on-primary">
                <Sparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 id="assistant-setup-title" className="text-title font-semibold text-on-surface">
                  Turn on your assistant
                </h2>
                <p className="text-label text-on-surface-variant">{assistantPitch}.</p>
              </div>
            </div>
            <IconButton size="xs" onClick={() => setAssistantOpen(false)} aria-label="Close" className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </IconButton>
            <AssistantSetup
              locked={!whatsappReady}
              onDone={() => {
                setTurnedOn(true);
                setAssistantOpen(false);
              }}
            />
          </>
        )}
      </Modal>

      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        aria-labelledby="connect-whatsapp-title"
        className="max-w-[520px] p-6"
      >
        {() => (
          <>
            <div className="mb-6 flex items-center gap-3 pr-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
              </div>
              <h2 id="connect-whatsapp-title" className="text-title font-semibold text-on-surface">
                Connect WhatsApp
              </h2>
            </div>
            <IconButton size="xs" onClick={() => setConnectOpen(false)} aria-label="Close" className="absolute right-4 top-4">
              <X className="h-4 w-4" />
            </IconButton>
            <WhatsAppConnectionPanel compact />
          </>
        )}
      </Modal>
    </>
  );
}
