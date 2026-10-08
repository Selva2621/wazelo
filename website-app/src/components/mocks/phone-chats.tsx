"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CalendarDays, FileText } from "lucide-react";
import {
  PhoneFrame,
  Incoming,
  Outgoing,
  QuickReply,
  Time,
  TypingBubble,
  bubbleEnter,
  usePageVisible,
} from "@/components/mocks/phone-frame";
import { ListingIllustration, ProposalIllustration } from "@/components/mocks/illustrations";
import { visibleItems, type Story } from "@/components/home/stories";

/* ─── Sign-in loop ───────────────────────────────────────────────────────────
   The exact conversation from the app's sign-in page: what a client sees when a
   freelancer uses Wazelo. Beats: 0 empty · 1 proposal · 2 "Book a call" pressed ·
   3 client reply · 4 typing · 5 booked · 6 client confirms, then loop. */
const STEP_MS = [700, 2000, 450, 1100, 1300, 1600, 4200];
const FINAL_STEP = STEP_MS.length - 1;

export function ProposalLoopPhone() {
  const reduceMotion = useReducedMotion();
  const visible = usePageVisible();
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);
  const beat = reduceMotion ? FINAL_STEP : step;

  useEffect(() => {
    if (reduceMotion || !visible) return;
    const timer = setTimeout(() => {
      if (step === FINAL_STEP) setCycle((c) => c + 1);
      setStep((s) => (s + 1) % STEP_MS.length);
    }, STEP_MS[step]);
    return () => clearTimeout(timer);
  }, [step, visible, reduceMotion]);

  return (
    <PhoneFrame contact={{ name: "Riya Kapoor", initials: "RK", subtitle: "UI/UX designer", verified: true }} typing={beat === 4}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={cycle} exit={{ opacity: 0, transition: { duration: 0.24 } }} className="flex flex-col gap-1.5">
          <AnimatePresence mode="popLayout" initial={false}>
            {beat >= 1 && (
              <motion.div key="rich" layout {...bubbleEnter} className="flex max-w-[92%] flex-col gap-1 self-start">
                <div className="overflow-hidden rounded-lg rounded-tl-sm bg-[var(--wa-in)] p-1 shadow-sm">
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
              <motion.div key="c1" layout {...bubbleEnter} className="flex flex-col">
                <Outgoing>
                  Book a call
                  <Time read>10:43</Time>
                </Outgoing>
              </motion.div>
            )}
            {beat === 4 && (
              <motion.div key="typing" layout {...bubbleEnter} className="flex flex-col">
                <TypingBubble />
              </motion.div>
            )}
            {beat >= 5 && (
              <motion.div key="b1" layout {...bubbleEnter} className="flex flex-col">
                <Incoming>
                  Booked for Tue, 11 AM. Calendar invite sent!
                  <Time>10:43</Time>
                </Incoming>
              </motion.div>
            )}
            {beat >= 6 && (
              <motion.div key="c2" layout {...bubbleEnter} className="flex flex-col">
                <Outgoing>
                  Perfect, see you then!
                  <Time read>10:44</Time>
                </Outgoing>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </PhoneFrame>
  );
}

/* ─── Story phone ────────────────────────────────────────────────────────────
   The customer's side of a homepage story. "biz" messages arrive, "customer"
   messages go out, internal notes are skipped. */
export function StoryPhone({ story, beat, revealed }: { story: Story; beat: number; revealed: number }) {
  const items = visibleItems(story, beat, revealed).filter(({ item }) => item.kind !== "note");
  const last = items[items.length - 1]?.item;
  const typing = last?.kind === "typing";
  // A button looks pressed only while the tap is the latest thing that happened.
  const pressed = last?.kind === "press" ? last : null;

  return (
    <PhoneFrame contact={story.phoneContact} typing={typing}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map(({ key, item }) => {
          if (item.kind === "press" || item.kind === "note") return null;
          if (item.kind === "typing") {
            return item === last ? (
              <motion.div key={key} layout {...bubbleEnter} className="flex flex-col">
                <TypingBubble />
              </motion.div>
            ) : null;
          }
          if (item.kind === "rich") {
            const Art = item.art === "proposal" ? ProposalIllustration : ListingIllustration;
            return (
              <motion.div key={key} layout {...bubbleEnter} className="flex max-w-[92%] flex-col gap-1 self-start">
                <div className="overflow-hidden rounded-lg rounded-tl-sm bg-[var(--wa-in)] p-1 shadow-sm">
                  <Art className="aspect-[5/2] w-full rounded-md" />
                  <p className="px-1.5 pb-1 pt-1.5 text-label font-normal text-[var(--wa-text)]">
                    {item.text}
                    <Time>{item.time}</Time>
                  </p>
                </div>
                {item.buttons.map((b) => (
                  <QuickReply key={b} label={b} pressed={pressed?.target === item.id && pressed.button === b} />
                ))}
              </motion.div>
            );
          }
          const Bubble = item.kind === "biz" ? Incoming : Outgoing;
          return (
            <motion.div key={key} layout {...bubbleEnter} className="flex flex-col">
              <Bubble>
                {item.text}
                <Time read={item.kind === "customer"}>{item.time}</Time>
              </Bubble>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </PhoneFrame>
  );
}
