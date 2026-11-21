"use client";

// WhatsApp phone mock-up, ported from the app's sign-in page
// (frontend/src/components/auth/phone-chat-showcase.tsx). The frame is shared;
// each story passes its own conversation as children.

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BadgeCheck,
  BatteryFull,
  Camera,
  CheckCheck,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  Signal,
  Smile,
  Video,
  Wifi,
} from "lucide-react";
import { springs } from "@/components/mocks/motion";

/** True while the tab is visible, so looping mocks pause in background tabs. */
export function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState === "visible");
    onChange();
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return visible;
}

interface PhoneFrameProps {
  contact: { name: string; initials: string; subtitle: string; verified?: boolean };
  typing?: boolean;
  children: ReactNode;
}

export function PhoneFrame({ contact, typing, children }: PhoneFrameProps) {
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
              {contact.initials}
            </span>
            <div className="min-w-0 flex-1 leading-tight">
              <p className="flex items-center gap-1 truncate text-label font-semibold">
                {contact.name}
                {contact.verified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-[var(--wa-accent)]" />}
              </p>
              <p className="truncate text-caption font-normal opacity-75">{typing ? "typing…" : contact.subtitle}</p>
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
            {children}
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

/* ─── Chat parts ─────────────────────────────────────────────────────────── */

export function Time({ children, read }: { children: ReactNode; read?: boolean }) {
  return (
    <span className="ml-2 inline-flex translate-y-1 items-center gap-0.5 whitespace-nowrap text-caption font-normal text-[var(--wa-meta)]">
      {children}
      {read && <CheckCheck className="h-3.5 w-3.5 text-[var(--wa-tick)]" />}
    </span>
  );
}

export function Incoming({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[85%] self-start rounded-lg rounded-tl-sm bg-[var(--wa-in)] px-2.5 py-1.5 text-label font-normal text-[var(--wa-text)] shadow-sm">
      {children}
    </div>
  );
}

export function Outgoing({ children }: { children: ReactNode }) {
  return (
    <div className="max-w-[85%] self-end rounded-lg rounded-tr-sm bg-[var(--wa-out)] px-2.5 py-1.5 text-label font-normal text-[var(--wa-text)] shadow-sm">
      {children}
    </div>
  );
}

export function QuickReply({ icon, label, pressed }: { icon?: ReactNode; label: string; pressed?: boolean }) {
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

export function TypingBubble() {
  return (
    <div className="flex items-center gap-1 self-start rounded-lg rounded-tl-sm bg-[var(--wa-in)] px-3 py-2.5 shadow-sm">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-[var(--wa-meta)]"
          animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
          transition={{ duration: 0.96, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

/** Entrance used by every bubble. */
export const bubbleEnter = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, transition: { duration: 0.12 } },
  transition: springs.gentle,
};
