"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  ArrowRight,
  Check,
  Smartphone,
  Package,
  FileText,
  Contact,
  MessageCircle,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetupChecklist, type ChecklistItem } from "@/hooks/use-setup-checklist";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";
import { AssistantSetup, AssistantSwitch, useAssistantStatus } from "@/components/dashboard/assistant-setup";

const ITEM_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  whatsapp: { icon: Smartphone, color: "text-success", bg: "bg-success/10" },
  products:  { icon: Package,    color: "text-warning", bg: "bg-warning/10" },
  template:  { icon: FileText,   color: "text-primary",    bg: "bg-primary/10"    },
  contacts:  { icon: Contact,    color: "text-chart-4",   bg: "bg-chart-4/10"   },
};

/* ── SVG circular progress ring ─────────────────── */
function ProgressRing({ pct, size = 56 }: { pct: number; size?: number }) {
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--outline-variant)" strokeWidth={stroke} strokeOpacity="0.25" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

/* ── A step still to do ──────────────────────────── */
function TaskRow({ item, onConnectWhatsApp }: { item: ChecklistItem; onConnectWhatsApp: () => void }) {
  const meta = ITEM_META[item.id] ?? { icon: ArrowRight, color: "text-primary", bg: "bg-primary/10" };
  const Icon = meta.icon;

  const content = (
    <>
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", meta.bg)}>
        <Icon className={cn("h-4.5 w-4.5", meta.color)} />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-body font-medium text-on-surface">{item.label}</span>
        <span className="block truncate text-label text-on-surface-variant">{item.description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-on-surface-variant/40 transition-colors group-hover:text-primary" />
    </>
  );

  const rowClass =
    "group flex w-full items-center gap-3 rounded-2xl border border-outline-variant/30 px-3 py-2.5 transition-colors hover:border-primary/40 hover:bg-primary/5";

  if (item.action === "connect-whatsapp") {
    return (
      <button type="button" onClick={onConnectWhatsApp} className={rowClass}>
        {content}
      </button>
    );
  }
  return (
    <Link href={item.href} className={rowClass}>
      {content}
    </Link>
  );
}

/* ── Main component ──────────────────────────────── */
/**
 * "Get set up": the basics (WhatsApp, a template, first contacts) and, for admins,
 * turning on the assistant (chatbot + automations), with one progress ring for all.
 * Hidden once every step is done or the card is dismissed.
 */
export function SetupChecklist() {
  const { items, dismissed, dismiss } = useSetupChecklist();
  const assistant = useAssistantStatus();
  const [connectOpen, setConnectOpen] = useState(false);
  const [turnedOn, setTurnedOn] = useState<string[] | null>(null);

  const basicsLeft = items.filter((i) => !i.done);
  const basicsDone = items.filter((i) => i.done);
  const whatsappReady = items.find((i) => i.id === "whatsapp")?.done ?? false;
  const assistantDone = assistant.done || !!turnedOn;

  const total = items.length + (assistant.applicable ? 1 : 0);
  const doneCount = basicsDone.length + (assistant.applicable && assistantDone ? 1 : 0);
  const pct = total === 0 ? 100 : Math.round((doneCount / total) * 100);
  const everythingDone = doneCount === total;

  // Stay up just after turning the assistant on, to confirm it worked
  const visible = !dismissed && !assistant.loading && (!everythingDone || !!turnedOn);

  // Card done or dismissed: what's left is the assistant's on/off switch
  if (!visible && !connectOpen) return <AssistantSwitch />;

  return (
    <>
      {visible && (
        <section
          aria-labelledby="setup-title"
          className="relative rounded-3xl border border-outline-variant bg-surface-container-lowest p-5 sm:p-6"
        >
          <IconButton size="xs" onClick={dismiss} aria-label="Dismiss" className="absolute right-4 top-4">
            <X className="h-3.5 w-3.5" />
          </IconButton>

          {/* Header: one ring for every step */}
          <div className="flex items-center gap-4 pr-8">
            <div className="relative grid place-items-center">
              <ProgressRing pct={pct} />
              <span className="absolute text-label font-semibold tabular-nums text-on-surface">
                {doneCount}/{total}
              </span>
            </div>
            <div className="min-w-0">
              <h2 id="setup-title" className="text-title-sm font-semibold text-on-surface">
                {everythingDone ? "You're all set" : "Get set up"}
              </h2>
              <p className="text-label text-on-surface-variant">
                {everythingDone
                  ? "Your assistant is answering new enquiries."
                  : `${total - doneCount} ${total - doneCount === 1 ? "step" : "steps"} left to start winning clients on WhatsApp`}
              </p>
            </div>
          </div>

          {/* Basics: finished ones shrink to chips, the rest stay as rows */}
          {basicsDone.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label="Done">
              {basicsDone.map((item) => (
                <li
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-3 py-1 text-label font-medium text-success"
                >
                  <Check className="h-3.5 w-3.5" />
                  {item.label}
                </li>
              ))}
            </ul>
          )}
          {basicsLeft.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {basicsLeft.map((item) => (
                <TaskRow key={item.id} item={item} onConnectWhatsApp={() => setConnectOpen(true)} />
              ))}
            </div>
          )}

          {/* Assistant: the last step, done in place; once on, its switch */}
          {assistant.applicable && assistantDone && (
            <div className="mt-5 border-t border-outline-variant/30 pt-5">
              <AssistantSwitch className="border-0 px-0 py-0" />
            </div>
          )}
          {assistant.applicable && !assistantDone && (
            <div className="mt-5 border-t border-outline-variant/30 pt-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-on-primary">
                  <Sparkles className="h-4.5 w-4.5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-body-lg font-semibold text-on-surface">Turn on your assistant</h3>
                  <p className="text-label text-on-surface-variant">
                    Answers new enquiries, follows up and chases proposals for you.
                  </p>
                </div>
              </div>
              <AssistantSetup locked={!whatsappReady} onDone={setTurnedOn} />
            </div>
          )}
        </section>
      )}

      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        aria-labelledby="connect-whatsapp-title"
        className="max-w-[520px] p-6"
      >
        {() => (
          <>
            <div className="flex items-center gap-3 mb-6 pr-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
              </div>
              <h2 id="connect-whatsapp-title" className="text-title font-semibold text-on-surface">
                Connect WhatsApp
              </h2>
            </div>
            <IconButton size="xs"
              onClick={() => setConnectOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </IconButton>
            <WhatsAppConnectionPanel compact />
          </>
        )}
      </Modal>
    </>
  );
}
