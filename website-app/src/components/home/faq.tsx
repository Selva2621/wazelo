"use client";

// FAQ as a support chat: the accordion on the left is the accessible source of
// truth; the phone on the right replays the selected question as a WhatsApp
// conversation (sent, typing, answered).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus } from "lucide-react";
import { Reveal } from "@/components/home/reveal";
import { Incoming, Outgoing, PhoneFrame, Time, TypingBubble, bubbleEnter } from "@/components/mocks/phone-frame";
import { gsap, useGSAP, MQ_FULL } from "@/lib/gsap";
import { Illustration } from "@/components/illustration";

const FAQ = [
  {
    q: "How do I connect my WhatsApp number?",
    a: "Click Connect WhatsApp in Wazelo. On your phone, open WhatsApp, go to Settings, Linked Devices, tap Link a Device and scan the QR code. It reconnects on its own after short drops.",
  },
  {
    q: "I'm a freelancer. Do I need a team plan?",
    a: "No. Pick Solo / Freelancer at sign-up and take Solo at ₹299 a month: 1 user, 1 number, Lead Scraper, a lead pipeline, 20 templates and drip sequences.",
  },
  {
    q: "What do team plans add?",
    a: "A shared inbox with assignment for more users and numbers, roles for Admin, Manager and Employee, audit logs, CSAT surveys and AI credits. Automation rules start on Growth.",
  },
  {
    q: "What does the free trial include?",
    a: "14 days, no card needed. You get 3 users, 3 WhatsApp numbers, 1,000 messages, 5 campaigns and 50 AI credits to try Wazelo with real chats.",
  },
  {
    q: "Where does the Lead Scraper find leads?",
    a: "Google Maps, Upwork Jobs, Freelancer.in, Truelancer and LinkedIn Jobs. Each run returns up to 200 results that you can import to contacts and target with a campaign.",
  },
  {
    q: "How do the AI features work?",
    a: "AI Summary, AI Insights and reply suggestions in the inbox use AI credits. Starter includes 50, Growth 200 and Pro 500. The Solo plan has no AI credits.",
  },
  {
    q: "Can I send bulk WhatsApp messages?",
    a: "Yes. Campaigns send text, media or templates to a filtered audience in rate-limited batches, and show Sent, Delivered, Read and Failed for each recipient.",
  },
  {
    q: "How is my data handled?",
    a: "Admins set roles and permissions for Admin, Manager and Employee, and audit logs record activity. GDPR tools cover consent, export and erase requests.",
  },
];

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
    <PhoneFrame contact={{ name: "Wazelo Support", initials: "WZ", subtitle: "Business account" }} typing={phase === "typing"}>
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

  // Desktop: the phone tilts up into place as the section scrolls in.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_FULL, () => {
        gsap.from("[data-faq=phone]", {
          y: 120,
          rotation: 6,
          autoAlpha: 0,
          ease: "none",
          scrollTrigger: { trigger: section.current, start: "top 85%", end: "top 30%", scrub: 1 },
        });
      });
    },
    { scope: section },
  );

  const toggle = (i: number) => {
    setOpen(open === i ? null : i);
    if (open !== i) setShown(i);
  };

  return (
    <section ref={section} id="faq" className="ember-rule scroll-mt-16 overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div aria-hidden className="glass-stage">
        <span className="right-[8%] top-1/4 h-96 w-96 bg-primary/15" />
      </div>
      <div className="relative mx-auto grid max-w-7xl gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <Reveal>
            <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-5xl">Questions, answered.</h2>
            <p className="mt-5 text-base leading-relaxed text-on-surface-variant">
              Something else on your mind?{" "}
              <Link href="/contact" className="font-medium text-primary-container underline-offset-4 hover:underline">
                Talk to sales
              </Link>
              .
            </p>
          </Reveal>
          <Illustration name="support" label="A support agent answering questions" className="mt-8 h-40 w-full max-w-xs" />

          <ul className="mt-10 flex flex-col divide-y divide-outline-variant border-y border-outline-variant">
            {FAQ.map((item, i) => {
              const isOpen = open === i;
              const id = `faq-${i}`;
              return (
                <li key={item.q}>
                  <h3>
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-controls={id}
                      onClick={() => toggle(i)}
                      className="flex w-full items-center justify-between gap-6 py-5 text-left text-base font-medium text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
                    >
                      {item.q}
                      <Plus className={`h-5 w-5 shrink-0 text-primary-container transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} />
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={id}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-[65ch] pb-6 text-sm leading-relaxed text-on-surface-variant">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="hidden lg:col-span-5 lg:block">
          <div className="sticky top-24 flex justify-center">
            <div data-faq="phone" className="relative">
              <div aria-hidden className="device-glow" />
              <SupportPhone index={shown} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
