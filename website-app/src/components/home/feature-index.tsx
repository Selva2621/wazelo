"use client";

// "Everything else in the box" as a hub: the Wazelo mark in the middle, one
// orbit per product area, every feature a chip on its ring. Rings spin slowly
// (CSS, alternating direction) and chips counter-spin to stay upright. The side
// panel tours the features one by one without stopping; hovering or focusing
// a chip jumps the tour to it.
// Every feature page is still linked from here.

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion, useInView } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Code2,
  Contact,
  Gauge,
  Inbox,
  KanbanSquare,
  Layers,
  Megaphone,
  Repeat,
  Star,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "@/components/home/reveal";
import { usePageVisible } from "@/components/mocks/phone-frame";
import { gsap, useGSAP, MQ_MOTION } from "@/lib/gsap";

type Feature = { icon: LucideIcon; name: string; text: string; href: string };
type Ring = {
  label: string;
  blurb: string;
  /** Tailwind text colour for the ring's icons and legend dot. */
  tone: string;
  dot: string;
  /** Radius as a fraction of the stage size. */
  r: number;
  /** Seconds per revolution; sign is the direction. */
  spin: number;
  offset: number;
  items: Feature[];
};

const RINGS: Ring[] = [
  {
    label: "Conversations",
    blurb: "Answer every chat, as a team.",
    tone: "text-primary-container",
    dot: "bg-primary-container",
    r: 0.19,
    spin: 60,
    offset: 45,
    items: [
      { icon: Inbox, name: "Shared inbox", text: "One number, the whole team. Assign chats, leave notes, never double-reply.", href: "/features/shared-inbox" },
      { icon: Bot, name: "Chatbot builder", text: "No-code flows that answer FAQs and qualify leads before a person steps in.", href: "/features/chatbot" },
      { icon: Layers, name: "Multi-channel", text: "Instagram, Messenger and email in the same inbox as WhatsApp.", href: "/features/multi-channel" },
      { icon: Star, name: "CSAT surveys", text: "A quick rating after every closed chat, reported per agent.", href: "/features/csat" },
    ],
  },
  {
    label: "Growth",
    blurb: "Reach people and follow up on time.",
    tone: "text-success",
    dot: "bg-success",
    r: 0.32,
    spin: -85,
    offset: 0,
    items: [
      { icon: Megaphone, name: "Campaigns", text: "Broadcast approved templates and track delivered, read and replied.", href: "/features/campaigns" },
      { icon: Repeat, name: "Sequences", text: "Follow-ups that send themselves on a timer until someone replies.", href: "/features/sequences" },
      { icon: Workflow, name: "Automation", text: "Rules that route, tag and reply around the clock.", href: "/features/automation" },
      { icon: Gauge, name: "Lead scoring", text: "Scores from replies and activity, so you know who to call first.", href: "/features/lead-scoring" },
    ],
  },
  {
    label: "Data and dev",
    blurb: "Keep records clean and connect your stack.",
    tone: "text-chart-2",
    dot: "bg-chart-2",
    r: 0.45,
    spin: 110,
    offset: 67.5,
    items: [
      { icon: Contact, name: "Contacts", text: "Tags, segments and custom fields on every number you talk to.", href: "/features/contacts" },
      { icon: KanbanSquare, name: "Deals pipeline", text: "Drag deals through stages and see the forecast add up.", href: "/features/deals" },
      { icon: BarChart3, name: "Analytics", text: "Response times, team load and campaign results in one report.", href: "/features/analytics" },
      { icon: Code2, name: "Developer API", text: "REST API and webhooks to send messages and sync data from your own code.", href: "/features/developer-api" },
    ],
  },
];

const ALL = RINGS.flatMap((ring) => ring.items.map((f) => ({ ...f, ring })));
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

const STEP_MS = 1800;

export function FeatureIndex() {
  const [index, setIndex] = useState(0);
  const section = useRef<HTMLElement>(null);
  const inView = useInView(section, { amount: 0.4 });
  const visible = usePageVisible();
  const active = ALL[index];
  const pick = (href: string) => setIndex(ALL.findIndex((f) => f.href === href));

  // Autoplay walks the features in ring order while the section is on screen and
  // never holds; pointing at a chip just jumps the tour to it.
  const playing = inView && visible;
  useEffect(() => {
    if (!playing) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % ALL.length), STEP_MS);
    return () => clearTimeout(t);
  }, [playing, index]);

  // Hub pops in, then the rings open outward one by one.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-orbit]", start: "top 75%", once: true } });
        tl.from("[data-hub]", { autoAlpha: 0, scale: 0.6, duration: 0.7, ease: "back.out(1.6)" }).from(
          "[data-ring-wrap]",
          { autoAlpha: 0, scale: 0.7, stagger: 0.15, duration: 0.9, ease: "power3.out" },
          "-=0.35",
        );
      });
    },
    { scope: section },
  );

  const ActiveIcon = active.icon;

  return (
    <section ref={section} id="features" className="relative scroll-mt-16 overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        {/* Copy + detail panel */}
        <div>
          <Reveal>
            <h2 className="max-w-xl text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-5xl">
              Everything else in the box.
            </h2>
            <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-on-surface-variant">
              {ALL.length} tools around one workspace. Point at any of them to see what it does.
            </p>
          </Reveal>

          <div className="lg-glass mt-8 min-h-[13.5rem] overflow-hidden rounded-2xl p-6">
            {/* Time left on this feature; restarts on every step. */}
            <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-outline-variant/40">
              <motion.div
                key={`${index}-${playing}`}
                className="h-full origin-left bg-primary-container"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: playing ? 1 : 0 }}
                transition={{ duration: playing ? STEP_MS / 1000 : 0, ease: "linear" }}
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={active.href}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-outline">
                  <span className={`size-1.5 rounded-full ${active.ring.dot}`} />
                  {active.ring.label}
                </p>
                <p className="mt-4 flex items-center gap-3 text-xl font-semibold text-on-surface">
                  <span className="lg-glass-pill grid size-10 place-items-center rounded-xl">
                    <ActiveIcon className={`h-5 w-5 ${active.ring.tone}`} />
                  </span>
                  {active.name}
                </p>
                <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{active.text}</p>
                <Link href={active.href} className={`group mt-5 inline-flex items-center gap-1.5 rounded text-sm font-medium text-primary-container ${focusRing}`}>
                  Open {active.name}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Legend */}
          <ul className="mt-6 hidden gap-6 lg:flex">
            {RINGS.map((ring) => (
              <li key={ring.label} className="flex items-center gap-2 text-sm text-on-surface-variant">
                <span className={`size-2 rounded-full ${ring.dot}`} />
                {ring.label}
                <span className="font-mono text-xs text-outline">{ring.items.length}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Orbit stage */}
        <div
          data-orbit
          className="orbit @container relative mx-auto aspect-square w-full max-w-[40rem]"
        >
          {/* Hub */}
          <div data-hub className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <span aria-hidden className="absolute inset-0 rounded-full bg-primary/25 motion-safe:animate-ping [animation-duration:3s]" />
            <span aria-hidden className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgb(var(--fx-accent)/0.35),transparent)]" />
            <span className="lg-glass relative grid size-16 place-items-center rounded-full sm:size-24">
              <Image src="/logo/logo.png" alt="Wazelo" width={56} height={56} className="size-9 sm:size-14" />
            </span>
          </div>

          {RINGS.map((ring) => {
            const dur = `${Math.abs(ring.spin)}s`;
            const dir = ring.spin > 0 ? "normal" : "reverse";
            const counter = ring.spin > 0 ? "reverse" : "normal";
            return (
              <div key={ring.label} data-ring-wrap className="absolute inset-0">
                {/* Track */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-outline-variant"
                  style={{ width: `${ring.r * 200}%`, height: `${ring.r * 200}%` }}
                />
                <div className="orbit-ring absolute inset-0" style={{ animationDuration: dur, animationDirection: dir }}>
                  {ring.items.map((f, i) => {
                    const angle = ring.offset + (360 / ring.items.length) * i;
                    const radius = `calc(100cqw * ${ring.r})`;
                    const on = active.href === f.href;
                    const Icon = f.icon;
                    return (
                      <div key={f.href}>
                        {/* Spoke from hub to chip */}
                        <span
                          aria-hidden
                          className={`absolute left-1/2 top-1/2 h-px origin-left transition-opacity duration-300 ${on ? "opacity-100" : "opacity-40"}`}
                          style={{
                            width: radius,
                            transform: `rotate(${angle}deg)`,
                            background: `linear-gradient(90deg, transparent, ${on ? "rgb(245 158 11 / 0.7)" : "rgb(110 117 148 / 0.35)"})`,
                          }}
                        />
                        {/* Chip */}
                        <div
                          className="absolute left-1/2 top-1/2 size-0"
                          style={{ transform: `rotate(${angle}deg) translateX(${radius}) rotate(${-angle}deg)` }}
                        >
                          <div className="orbit-chip absolute -left-5 -top-5 sm:-left-6 sm:-top-6" style={{ animationDuration: dur, animationDirection: counter }}>
                            <Link
                              href={f.href}
                              aria-label={`${f.name}: ${f.text}`}
                              onPointerEnter={() => pick(f.href)}
                              onFocus={() => pick(f.href)}
                              className={`group relative grid size-10 place-items-center rounded-xl border bg-surface-container-lowest/90 backdrop-blur transition-[transform,border-color,box-shadow] duration-300 hover:scale-110 sm:size-12 ${focusRing} ${
                                on ? "scale-110 border-primary/60 shadow-[0_0_24px_rgb(var(--fx-accent)/0.35)]" : "border-outline-variant"
                              }`}
                            >
                              <Icon className={`h-4 w-4 sm:h-5 sm:w-5 ${ring.tone}`} />
                              <span
                                className={`pointer-events-none absolute top-full mt-2 hidden whitespace-nowrap text-xs transition-colors lg:block ${
                                  on ? "text-on-surface" : "text-on-surface-variant"
                                }`}
                              >
                                {f.name}
                              </span>
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Small screens: the orbit has no labels, so list every tool too. */}
        <div className="grid gap-6 sm:grid-cols-3 lg:hidden">
          {RINGS.map((ring) => (
            <div key={ring.label}>
              <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-outline">
                <span className={`size-1.5 rounded-full ${ring.dot}`} />
                {ring.label}
              </p>
              <ul className="mt-3 space-y-1">
                {ring.items.map((f) => (
                  <li key={f.href}>
                    <Link href={f.href} className={`flex items-center gap-2.5 rounded-lg py-1.5 text-sm text-on-surface ${focusRing}`}>
                      <f.icon className={`h-4 w-4 ${ring.tone}`} />
                      {f.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
