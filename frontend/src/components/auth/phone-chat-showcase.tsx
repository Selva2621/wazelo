"use client";

// WhatsApp phone mock-up for the auth pages: what a client sees when a
// freelancer uses Wazelo. A rich proposal message with quick replies, then the
// client books a call, played as a loop. Load client-only (no SSR).

import { useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  BatteryFull,
  Camera,
  CalendarDays,
  CheckCheck,
  FileText,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Signal,
  Smile,
  Video,
  Wifi,
} from "lucide-react";
import { ProposalIllustration } from "@/components/auth/illustrations";
import { motionTokens, springs } from "@/lib/motion-tokens";

/**
 * Beats and how long each holds (ms):
 * 0 empty · 1 proposal arrives · 2 "Book a call" pressed · 3 client reply
 * 4 freelancer typing · 5 call booked · 6 client confirms, hold, then the chat fades and loops.
 */
const STEP_MS = [700, 2000, 450, 1100, 1300, 1600, 4200];
const FINAL_STEP = STEP_MS.length - 1;

function usePageVisible() {
  const [visible, setVisible] = useState(() => document.visibilityState === "visible");
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

const enter = {
  initial: { opacity: 0, y: motionTokens.distance.md, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, transition: { duration: motionTokens.duration.fast } },
  transition: springs.gentle,
};

function Time({ children, read }: { children: ReactNode; read?: boolean }) {
  return (
    <span className="ml-2 inline-flex translate-y-1 items-center gap-0.5 whitespace-nowrap text-caption font-normal text-[var(--wa-meta)]">
      {children}
      {read && <CheckCheck className="h-3.5 w-3.5 text-[var(--wa-tick)]" />}
    </span>
  );
}

function Incoming({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[85%] self-start rounded-lg rounded-tl-sm bg-[var(--wa-in)] px-2.5 py-1.5 text-label font-normal text-[var(--wa-text)] shadow-sm">
      {children}
    </div>
  );
}

function Outgoing({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[85%] self-end rounded-lg rounded-tr-sm bg-[var(--wa-out)] px-2.5 py-1.5 text-label font-normal text-[var(--wa-text)] shadow-sm">
      {children}
    </div>
  );
}

function QuickReply({ icon, label, pressed }: { icon: ReactNode; label: string; pressed?: boolean }) {
  return (
    <motion.div
      animate={{ scale: pressed ? 0.96 : 1, opacity: pressed ? 0.75 : 1 }}
      transition={springs.snappy}
      className="flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[var(--wa-in)] text-label font-medium text-[var(--wa-link)] shadow-sm"
    >
      {icon}
      {label}
    </motion.div>
  );
}

export function PhoneChatShowcase() {
  const reduceMotion = useReducedMotion();
  const visible = usePageVisible();
  const [step, setStep] = useState(0);
  // Each loop gets a fresh conversation so the reset is one clean fade, not a pile of exits.
  const [cycle, setCycle] = useState(0);
  const beat = reduceMotion ? FINAL_STEP : step;

  // One beat at a time; paused in background tabs.
  useEffect(() => {
    if (reduceMotion || !visible) return;
    const timer = setTimeout(() => {
      if (step === FINAL_STEP) setCycle((c) => c + 1);
      setStep((s) => (s + 1) % STEP_MS.length);
    }, STEP_MS[step]);
    return () => clearTimeout(timer);
  }, [step, visible, reduceMotion]);

  return (
    <div className="wa-phone relative" inert aria-hidden>
      {/* side buttons */}
      <span className="absolute -left-[3px] top-28 h-12 w-[3px] rounded-l bg-[var(--wa-frame)]" />
      <span className="absolute -right-[3px] top-24 h-16 w-[3px] rounded-r bg-[var(--wa-frame)]" />

      {/* bezel */}
      <div className="rounded-[2.6rem] bg-[var(--wa-frame)] p-[9px] shadow-modal ring-1 ring-white/10">
        <div className="relative flex h-[30.5rem] w-[15.5rem] flex-col overflow-hidden rounded-[2.1rem]">
          {/* status bar */}
          <div className="flex h-7 shrink-0 items-center justify-between bg-[var(--wa-header)] px-5 text-caption font-semibold text-[var(--wa-on-header)]">
            <span className="tabular-nums">9:41</span>
            <span className="absolute left-1/2 top-1.5 h-4 w-16 -translate-x-1/2 rounded-full bg-[var(--wa-frame)]" />
            <span className="flex items-center gap-1">
              <Signal className="h-3 w-3" />
              <Wifi className="h-3 w-3" />
              <BatteryFull className="h-3.5 w-3.5" />
            </span>
          </div>

          {/* chat header */}
          <div className="flex h-12 shrink-0 items-center gap-2 bg-[var(--wa-header)] px-2 text-[var(--wa-on-header)]">
            <ArrowLeft className="h-4 w-4 shrink-0" />
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-label font-semibold text-on-primary">
              RK
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1 truncate text-label font-semibold">
                Riya Kapoor
                <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--wa-accent)]" />
              </p>
              <p className="truncate text-caption font-normal opacity-75">
                {beat === 4 ? "typing…" : "UI/UX designer"}
              </p>
            </div>
            <Video className="h-4 w-4 shrink-0" />
            <Phone className="h-4 w-4 shrink-0" />
            <MoreVertical className="h-4 w-4 shrink-0" />
          </div>

          {/* conversation */}
          <div className="wa-wallpaper flex flex-1 flex-col justify-end gap-1.5 overflow-hidden px-2.5 py-3">
            <span className="mb-1 self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption font-normal uppercase text-[var(--wa-meta)] shadow-sm">
              Today
            </span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={cycle}
                exit={{ opacity: 0, transition: { duration: motionTokens.duration.slow } }}
                className="flex flex-col gap-1.5"
              >
            <AnimatePresence mode="popLayout" initial={false}>
              {beat >= 1 && (
                <motion.div key="rich" layout {...enter} className="flex max-w-[92%] flex-col gap-1 self-start">
                  <div className="overflow-hidden rounded-lg rounded-tl-sm bg-[var(--wa-in)] p-1 shadow-sm">
                    {/* Short banner so the full conversation fits without the top being clipped. */}
                    <ProposalIllustration className="aspect-[5/2] w-full rounded-md" />
                    <p className="px-1.5 pb-1 pt-1.5 text-label font-normal text-[var(--wa-text)]">
                      Hi Arjun! Here is my proposal for the Bloom Bakery website.
                      <Time>10:42</Time>
                    </p>
                  </div>
                  <QuickReply icon={<FileText className="h-3.5 w-3.5" />} label="View proposal" />
                  <QuickReply icon={<CalendarDays className="h-3.5 w-3.5" />} label="Book a call" pressed={beat === 2} />
                </motion.div>
              )}
              {beat >= 3 && (
                <motion.div key="c1" layout {...enter} className="flex flex-col">
                  <Outgoing>
                    Book a call
                    <Time read>10:43</Time>
                  </Outgoing>
                </motion.div>
              )}
              {beat === 4 && (
                <motion.div key="typing" layout {...enter} className="flex flex-col">
                  <div className="flex items-center gap-1 self-start rounded-lg rounded-tl-sm bg-[var(--wa-in)] px-3 py-2.5 shadow-sm">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="size-1.5 rounded-full bg-[var(--wa-meta)]"
                        animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
                        transition={{ duration: motionTokens.duration.crawl * 1.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
              {beat >= 5 && (
                <motion.div key="b1" layout {...enter} className="flex flex-col">
                  <Incoming>
                    Booked for Tue, 11 AM. Calendar invite sent!
                    <Time>10:43</Time>
                  </Incoming>
                </motion.div>
              )}
              {beat >= 6 && (
                <motion.div key="c2" layout {...enter} className="flex flex-col">
                  <Outgoing>
                    Perfect, see you then!
                    <Time read>10:44</Time>
                  </Outgoing>
                </motion.div>
              )}
            </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* composer */}
          <div className="flex shrink-0 items-center gap-1.5 bg-[var(--wa-bg)] px-2 pb-2 pt-1">
            <div className="flex h-9 flex-1 items-center gap-2 rounded-full bg-[var(--wa-input)] px-3 text-label font-normal text-[var(--wa-meta)] shadow-sm">
              <Smile className="h-4 w-4 shrink-0" />
              <span className="flex-1">Message</span>
              <Paperclip className="h-4 w-4 shrink-0" />
              <Camera className="h-4 w-4 shrink-0" />
            </div>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--wa-accent)] text-white">
              <Mic className="h-4 w-4" />
            </span>
          </div>
          {/* home indicator */}
          <div className="flex h-4 shrink-0 items-start justify-center bg-[var(--wa-bg)]">
            <span className="h-1 w-20 rounded-full bg-[var(--wa-meta)]/50" />
          </div>
        </div>
      </div>
    </div>
  );
}
