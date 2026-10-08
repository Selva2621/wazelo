"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowUpRight,
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
import { springs } from "@/components/mocks/motion";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";
import { Illustration } from "@/components/illustration";

type Category = "Conversations" | "Growth" | "Data and dev";

// Every feature page on the site, so the homepage keeps linking to all of them.
const FEATURES: { icon: LucideIcon; name: string; text: string; href: string; category: Category }[] = [
  { icon: Inbox, name: "Shared inbox", text: "One number, the whole team", href: "/features/shared-inbox", category: "Conversations" },
  { icon: Bot, name: "Chatbot builder", text: "No-code flows for FAQs", href: "/features/chatbot", category: "Conversations" },
  { icon: Layers, name: "Multi-channel", text: "Instagram, Messenger, email", href: "/features/multi-channel", category: "Conversations" },
  { icon: Star, name: "CSAT surveys", text: "Ratings after every chat", href: "/features/csat", category: "Conversations" },
  { icon: Megaphone, name: "Campaigns", text: "Broadcasts with delivery tracking", href: "/features/campaigns", category: "Growth" },
  { icon: Repeat, name: "Sequences", text: "Follow-ups on a timer", href: "/features/sequences", category: "Growth" },
  { icon: Workflow, name: "Automation", text: "Rules that run around the clock", href: "/features/automation", category: "Growth" },
  { icon: Gauge, name: "Lead scoring", text: "Know who to call first", href: "/features/lead-scoring", category: "Growth" },
  { icon: Contact, name: "Contacts", text: "Tags, segments, custom fields", href: "/features/contacts", category: "Data and dev" },
  { icon: KanbanSquare, name: "Deals pipeline", text: "Stages and forecasts", href: "/features/deals", category: "Data and dev" },
  { icon: BarChart3, name: "Analytics", text: "Team and campaign reports", href: "/features/analytics", category: "Data and dev" },
  { icon: Code2, name: "Developer API", text: "REST API and webhooks", href: "/features/developer-api", category: "Data and dev" },
];

const FILTERS: ("All" | Category)[] = ["All", "Conversations", "Growth", "Data and dev"];
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

function FeatureCard({ f }: { f: (typeof FEATURES)[number] }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const Icon = f.icon;

  // Spotlight follows the pointer through CSS variables; no React state per move.
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };

  return (
    <Link
      ref={ref}
      data-feature-card
      href={f.href}
      onPointerMove={onMove}
      className={`lg-glass group relative flex h-full flex-col overflow-hidden rounded-2xl p-6 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-primary/35 active:scale-[0.99] ${focusRing}`}
    >
      <span aria-hidden className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <span className="relative flex items-start justify-between">
        <span className="lg-glass-pill grid size-10 place-items-center rounded-xl">
          <Icon className="h-5 w-5 text-primary-container" />
        </span>
        <ArrowUpRight className="h-5 w-5 text-outline transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary-container" />
      </span>
      <span className="relative mt-8 block font-medium text-on-surface">{f.name}</span>
      <span className="relative mt-1 block text-sm text-on-surface-variant">{f.text}</span>
    </Link>
  );
}

export function FeatureIndex() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const reduce = useReducedMotion();
  const section = useRef<HTMLElement>(null);

  // Cards arrive in staggered batches as they scroll in. GSAP animates only the
  // inner card links; framer-motion owns the list items for the filter reflow.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.set("[data-feature-card]", { autoAlpha: 0, y: 48 });
        ScrollTrigger.batch("[data-feature-card]", {
          start: "top 88%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { autoAlpha: 1, y: 0, stagger: 0.08, duration: 0.8, ease: "power3.out", overwrite: true, clearProps: "transform" }),
        });
      });
    },
    { scope: section },
  );
  const items = filter === "All" ? FEATURES : FEATURES.filter((f) => f.category === filter);

  return (
    <section ref={section} id="features" className="relative scroll-mt-16 overflow-hidden px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <div aria-hidden className="glass-stage">
        <span className="right-1/4 top-1/3 h-96 w-[40rem] bg-primary/15" />
        <span className="-left-16 bottom-0 h-72 w-72 bg-[#24403b]/50" />
      </div>

      <div className="relative mx-auto max-w-7xl">
        <Reveal className="flex items-end justify-between gap-10">
          <div>
            <h2 className="max-w-2xl text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-5xl">
              Everything else in the box.
            </h2>
            <p className="mt-5 max-w-[60ch] text-base leading-relaxed text-on-surface-variant">
              Twelve tools in one workspace. Filter by what you need, then open any one for the details.
            </p>
          </div>
          <Illustration name="toolbox" className="hidden h-40 w-60 shrink-0 lg:block" />
        </Reveal>

        <div className="mt-10">
          <div role="group" aria-label="Filter features" className="lg-glass-pill flex w-full gap-1 overflow-x-auto rounded-full p-1 [scrollbar-width:none] sm:w-max [&::-webkit-scrollbar]:hidden">
            {FILTERS.map((f) => {
              const count = f === "All" ? FEATURES.length : FEATURES.filter((x) => x.category === f).length;
              const on = f === filter;
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f)}
                  className={`relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-[background-color] ${focusRing} ${
                    on ? "text-on-primary" : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {on && <motion.span layoutId="feature-filter" transition={springs.layout} className="absolute inset-0 rounded-full bg-primary-container" />}
                  <span className="relative">{f}</span>
                  <span className={`relative font-mono text-xs tabular-nums ${on ? "text-on-primary/70" : "text-outline"}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <motion.ul layout={!reduce} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((f, i) => (
                <motion.li
                  key={f.href}
                  layout={!reduce}
                  initial={reduce ? false : { opacity: 0, scale: 0.94, filter: "blur(6px)" }}
                  animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.94, filter: "blur(6px)", transition: { duration: 0.18 } }}
                  transition={{ ...springs.gentle, delay: reduce ? 0 : Math.min(i, 8) * 0.025 }}
                >
                  <FeatureCard f={f} />
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        </div>
      </div>
    </section>
  );
}
