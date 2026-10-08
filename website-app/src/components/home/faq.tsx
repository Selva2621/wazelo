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
    q: "I'm a freelancer. Do I need a team plan?",
    a: "No. Choose “Solo / Freelancer” at sign-up and take the Solo plan at ₹299 a month. You get Lead Scraper, a client pipeline, 26 ready templates and follow-up sequences. You can switch to a team setup later in Settings.",
  },
  {
    q: "What do teams get that freelancers don't?",
    a: "Team accounts add assignments and a My Team view, automation, the chatbot and chat widget, CSAT surveys, roles for Admin, Manager and Employee, audit logs and multiple WhatsApp numbers.",
  },
  {
    q: "How much does it cost?",
    a: "Solo is ₹299 a month. Team plans are Starter at ₹499, Growth at ₹999 and Pro at ₹1,999 a month. Enterprise starts at ₹3,999 a month. Every plan has a 14-day free trial with no credit card.",
  },
  {
    q: "Does it use the official WhatsApp Business API?",
    a: "Yes. Wazelo is built on the official WhatsApp Business API from Meta. It supports multiple WhatsApp numbers, approved message templates and Meta's compliance requirements.",
  },
  {
    q: "Can several people use the same WhatsApp number?",
    a: "Yes. The shared inbox lets your whole team work one number at the same time. Chats are assigned to agents, tracked to resolution and reported on.",
  },
  {
    q: "Can I send bulk WhatsApp messages?",
    a: "Yes. Campaigns send personalised template messages to your segments, with live delivery tracking. Growth includes 25,000 messages a month and Pro includes 1,00,000.",
  },
  {
    q: "How is Wazelo different from Interakt, Wati or AiSensy?",
    a: "Wazelo puts the shared inbox, campaigns, automation, chatbot and analytics in one product, and adds a Solo plan with lead finding and proposals for freelancers.",
  },
  {
    q: "Is my data secure?",
    a: "Wazelo runs on Meta's official API infrastructure, with role-based access, audit logs and GDPR tools for data requests.",
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
