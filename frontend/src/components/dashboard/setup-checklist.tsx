"use client";

import { useState } from "react";
import Link from "next/link";
import { X, Check, MessageCircle, Power, Sparkles, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetupChecklist, type ChecklistItem } from "@/hooks/use-setup-checklist";
import { useWhatsAppSession } from "@/hooks/use-whatsapp";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";
import { AssistantSetup, useAssistantControls, useAssistantStatus } from "@/components/dashboard/assistant-setup";

/** The button each basic step shows until it's done */
const STEP_ACTION: Record<string, string> = {
  whatsapp: "Connect",
  products: "Add",
  template: "Create",
  contacts: "Find leads",
};

/* ── SVG circular progress ring ─────────────────── */
function ProgressRing({ pct, size = 44 }: { pct: number; size?: number }) {
  const stroke = 4;
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

type StepState = "done" | "current" | "todo";

/** One numbered step with a line down to the next */
function Step({
  index,
  state,
  title,
  detail,
  action,
  last,
}: {
  index: number;
  state: StepState;
  title: string;
  detail: React.ReactNode;
  action?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <li className="relative flex gap-3 pb-4 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute left-[15px] top-8 bottom-0 w-0.5 rounded-full",
            state === "done" ? "bg-success/40" : "bg-outline-variant/50",
          )}
        />
      )}
      <span
        className={cn(
          "relative z-[1] grid size-8 shrink-0 place-items-center rounded-full text-label font-semibold tabular-nums",
          state === "done" && "bg-success text-white",
          state === "current" && "bg-primary text-on-primary ring-4 ring-primary/15",
          state === "todo" && "border border-outline-variant bg-surface-container-lowest text-on-surface-variant",
        )}
      >
        {state === "done" ? <Check className="h-4 w-4" /> : index}
      </span>
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1.5 pt-1">
        <div className="min-w-0 flex-1">
          <p className={cn("text-body font-semibold", state === "todo" ? "text-on-surface-variant" : "text-on-surface")}>
            {title}
          </p>
          <div className="text-label text-on-surface-variant">{detail}</div>
        </div>
        {action}
      </div>
    </li>
  );
}

const ACTION_CLASS =
  "inline-flex shrink-0 items-center rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-label font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/10 active:scale-[0.98]";

/* ── Main component ──────────────────────────────── */
/**
 * "Get set up": every step one under the other, numbered: the basics (WhatsApp, a
 * template, first contacts) and, for admins, the assistant (chatbot + automations) with
 * its on/off switch. Always shown; once everything is done it reads "You're all set".
 */
export function SetupChecklist({ className }: { className?: string } = {}) {
  const { items } = useSetupChecklist();
  const assistant = useAssistantStatus();
  const controls = useAssistantControls(assistant.applicable);
  const { data: session } = useWhatsAppSession();
  const [connectOpen, setConnectOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [turnedOn, setTurnedOn] = useState(false);

  const whatsappReady = items.find((i) => i.id === "whatsapp")?.done ?? false;
  const assistantDone = assistant.done || turnedOn;

  const total = items.length + (assistant.applicable ? 1 : 0);
  const doneCount = items.filter((i) => i.done).length + (assistant.applicable && assistantDone ? 1 : 0);
  const pct = total === 0 ? 100 : Math.round((doneCount / total) * 100);
  const everythingDone = doneCount === total;

  // The first unfinished step is the one to do now
  const order = [...items.map((i) => ({ id: i.id, done: i.done })), ...(assistant.applicable ? [{ id: "assistant", done: assistantDone }] : [])];
  const currentId = order.find((s) => !s.done)?.id;
  const stateOf = (id: string, done: boolean): StepState => (done ? "done" : id === currentId ? "current" : "todo");

  function basicAction(item: ChecklistItem) {
    if (item.done) return null;
    const label = STEP_ACTION[item.id] ?? "Open";
    if (item.action === "connect-whatsapp") {
      return (
        <button type="button" onClick={() => setConnectOpen(true)} className={ACTION_CLASS}>
          {label}
        </button>
      );
    }
    return (
      <Link href={item.href} className={ACTION_CLASS}>
        {label}
      </Link>
    );
  }

  function basicDetail(item: ChecklistItem) {
    if (!item.done) return item.description;
    if (item.id === "whatsapp") return session?.phoneNumber ? `Connected · ${session.phoneNumber}` : "Connected";
    return "Done";
  }

  return (
    <>
      <section
        aria-labelledby="setup-title"
        className={cn("rounded-3xl border border-outline-variant bg-surface-container-lowest p-5", className)}
      >
        <div className="mb-4 flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
          <div className="min-w-0">
            <h2 id="setup-title" className="text-title-sm font-semibold text-on-surface">
              {everythingDone ? "You're all set" : "Get set up"}
            </h2>
            <p className="text-label text-on-surface-variant">
              {doneCount} of {total} done
            </p>
          </div>
          <div className="relative grid shrink-0 place-items-center">
            <ProgressRing pct={pct} />
            <span className="absolute text-caption font-semibold tabular-nums text-on-surface">{pct}%</span>
          </div>
        </div>

        <ol>
          {items.map((item, i) => (
            <Step
              key={item.id}
              index={i + 1}
              state={stateOf(item.id, item.done)}
              title={item.label}
              detail={basicDetail(item)}
              action={basicAction(item)}
              last={!assistant.applicable && i === items.length - 1}
            />
          ))}

          {assistant.applicable && (
            <Step
              index={items.length + 1}
              state={stateOf("assistant", assistantDone)}
              title="Turn on your assistant"
              detail={
                !assistantDone
                  ? whatsappReady
                    ? "Answers new enquiries, follows up and chases proposals for you"
                    : (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="h-3 w-3" /> Connect WhatsApp first
                      </span>
                    )
                  : controls.exists
                    ? controls.isOn
                      ? `${controls.runningCount} of ${controls.total} running, replying and following up for you`
                      : "Off. New enquiries wait for you to reply"
                    : "Running"
              }
              action={
                !assistantDone ? (
                  <button
                    type="button"
                    disabled={!whatsappReady}
                    onClick={() => setAssistantOpen(true)}
                    className={cn(ACTION_CLASS, "disabled:cursor-not-allowed disabled:opacity-50")}
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Set up
                  </button>
                ) : controls.exists ? (
                  <Button
                    size="sm"
                    variant={controls.isOn ? "ghost" : "primary"}
                    loading={controls.busy}
                    onClick={controls.isOn ? controls.turnOff : controls.turnOn}
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5" />
                    {controls.isOn ? "Turn off" : "Turn on"}
                  </Button>
                ) : null
              }
              last
            />
          )}
        </ol>

        {assistant.applicable && assistantDone && (
          <p className="mt-4 flex items-center justify-between border-t border-outline-variant/40 pt-3 text-label text-on-surface-variant">
            Chatbot and automations
            <Link href="/automation" className="font-semibold text-primary hover:underline">
              Configure
            </Link>
          </p>
        )}
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
                <p className="text-label text-on-surface-variant">
                  Answers new enquiries, follows up and chases proposals for you.
                </p>
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
