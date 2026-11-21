"use client";

// FAQ as a support chat: the accordion on the left is the accessible source of
// truth; the phone on the right replays the selected question as a WhatsApp
// conversation (sent, typing, answered).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { Incoming, Outgoing, PhoneFrame, Time, TypingBubble, bubbleEnter } from "@/components/mocks/phone-frame";
import { gsap, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";

import { FAQ } from "./faq-data";

type Phase = "sent" | "typing" | "answered";

function SupportPhone({ index }: { index: number }) {
  const reduce = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("answered");
  const first = useRef(true);

  // Replay the exchange each time a new question is chosen.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (reduce) {
      setPhase("answered");
      return;
    }
    setPhase("sent");
    const t1 = setTimeout(() => setPhase("typing"), 500);
    const t2 = setTimeout(() => setPhase("answered"), 1600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [index, reduce]);

  const item = FAQ[index];
  return (
    <PhoneFrame contact={{ name: "Wazelo Support", initials: "WZ", subtitle: "Business account", verified: true }} typing={phase === "typing"}>
      <div className="flex flex-col">
        <Incoming>
          Hi! Ask us anything about Wazelo.
          <Time>09:30</Time>
        </Incoming>
      </div>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div key={`q-${index}`} layout {...bubbleEnter} className="flex flex-col">
          <Outgoing>
            {item.q}
            <Time read>09:31</Time>
          </Outgoing>
        </motion.div>
        {phase === "typing" && (
          <motion.div key={`t-${index}`} layout {...bubbleEnter} className="flex flex-col">
            <TypingBubble />
          </motion.div>
        )}
        {phase === "answered" && (
          <motion.div key={`a-${index}`} layout {...bubbleEnter} className="flex flex-col">
            <Incoming>
              {item.a}
              <Time>09:31</Time>
            </Incoming>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneFrame>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const [shown, setShown] = useState(0);
  const section = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.from("[data-faq=head] > *", { y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: "expo.out", scrollTrigger: { trigger: section.current, start: "top 75%", once: true } });
        gsap.from("[data-faq=item]", { y: 30, autoAlpha: 0, stagger: 0.06, duration: 0.9, ease: "expo.out", scrollTrigger: { trigger: "[data-faq=list]", start: "top 80%", once: true } });
      });
      // Desktop: the phone tilts up into place as the section scrolls in.
      mm.add(MQ_FULL, () => {
        gsap.from("[data-faq=phone]", { y: 120, rotation: 6, autoAlpha: 0, ease: "none", scrollTrigger: { trigger: section.current, start: "top 85%", end: "top 30%", scrub: 1 } });
      });
    },
    { scope: section },
  );

  const toggle = (i: number) => {
    setOpen(open === i ? null : i);
    if (open !== i) setShown(i);
  };

  return (
    <section ref={section} id="faq" className="relative scroll-mt-16 border-t border-ink/10 bg-paper px-4 py-28 text-ink sm:px-6 lg:px-8 lg:py-36">
      <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7">
          <div data-faq="head">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-ink-faint">Questions</p>
            <h2 className="mt-5 font-display text-5xl leading-[0.95] tracking-[-0.02em] md:text-7xl">
              Asked, <em className="text-rust">answered.</em>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-ink-soft">
              Something else on your mind?{" "}
              <Link href="/contact" className="font-semibold text-rust underline-offset-4 hover:underline">
                Talk to sales
              </Link>
              .
            </p>
          </div>

          <ul data-faq="list" className="mt-12 flex flex-col border-t border-ink/15">
            {FAQ.map((item, i) => {
              const isOpen = open === i;
              const id = `faq-${i}`;
              return (
                <li key={item.q} data-faq="item" className="border-b border-ink/15">
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={id}
                      onClick={() => toggle(i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium transition-colors hover:text-rust focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    >
                      <span className="flex min-w-0 items-baseline gap-4">
                        <span className="shrink-0 font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                        {item.q}
                      </span>
                      <span className={`grid size-8 shrink-0 place-items-center rounded-full border transition-all duration-300 ${isOpen ? "rotate-45 border-ink bg-ink text-paper" : "border-ink/20"}`}>
                        <Plus className="h-4 w-4" />
                      </span>
                    </button>
                  </h3>
                  {/* Always in the DOM (server HTML) so every answer is crawlable and
                      matches the FAQPage schema; collapsed + inert when closed. */}
                  <motion.div
                    id={id}
                    role="region"
                    aria-hidden={!isOpen}
                    inert={!isOpen}
                    initial={false}
                    animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="max-w-[62ch] pb-7 pl-9 text-[15px] leading-relaxed text-ink-soft">{item.a}</p>
                  </motion.div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-28 flex justify-center">
            <div data-faq="phone" className="relative">
              <SupportPhone index={shown} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
