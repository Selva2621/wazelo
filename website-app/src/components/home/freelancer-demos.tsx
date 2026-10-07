"use client";

// Interactive freelancer demos used inside the homepage's freelancer panels:
// Lead Scraper search, pipeline walk, draggable template deck and Solo price.

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "framer-motion";
import { Check, ChevronRight, Plus, Search } from "lucide-react";
import { useLoopActive } from "@/components/home/use-loop";
import { springs } from "@/components/mocks/motion";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/* ─── Lead Scraper ───────────────────────────────────────────────────────── */

const SOURCES = [
  {
    name: "Google Maps",
    query: "Bakeries in Chennai",
    results: [
      { title: "Bloom Bakery", meta: "4.7 rating, Anna Nagar" },
      { title: "Crumbs & Co.", meta: "4.5 rating, Adyar" },
      { title: "Kaapi Corner", meta: "4.4 rating, Mylapore" },
    ],
  },
  {
    name: "Upwork Jobs",
    query: "Figma landing page",
    results: [
      { title: "Landing page for a fintech app", meta: "$400 fixed, posted 2h ago" },
      { title: "Redesign a Shopify store", meta: "$650 fixed, posted 5h ago" },
      { title: "UI audit for a SaaS dashboard", meta: "$30 an hour, posted 1d ago" },
    ],
  },
  {
    name: "Freelancer.in",
    query: "Logo and brand kit",
    results: [
      { title: "Logo for an organic food brand", meta: "₹8,000, 12 bids" },
      { title: "Brand kit for a café", meta: "₹15,000, 7 bids" },
      { title: "Rebrand for a coaching centre", meta: "₹12,500, 4 bids" },
    ],
  },
  {
    name: "Truelancer",
    query: "WordPress website",
    results: [
      { title: "Clinic website in WordPress", meta: "₹20,000, Bengaluru" },
      { title: "Portfolio site for an architect", meta: "₹14,000, Pune" },
      { title: "School website refresh", meta: "₹25,000, Kochi" },
    ],
  },
  {
    name: "LinkedIn Jobs",
    query: "Freelance UX designer",
    results: [
      { title: "UX designer, 3-month contract", meta: "Remote, fintech startup" },
      { title: "Product designer, part-time", meta: "Hybrid, Hyderabad" },
      { title: "UX researcher, freelance", meta: "Remote, edtech" },
    ],
  },
];

export function LeadScraperDemo() {
  const { ref, active, reduce } = useLoopActive();
  const [src, setSrc] = useState(0);
  const [typed, setTyped] = useState(0);
  const [shown, setShown] = useState(0);
  const [added, setAdded] = useState(false);
  const source = SOURCES[src];

  // One step at a time: type the query, reveal results, add the first, move on.
  useEffect(() => {
    if (!active) return;
    let t: ReturnType<typeof setTimeout>;
    if (typed < source.query.length) t = setTimeout(() => setTyped((n) => n + 1), 55);
    else if (shown < source.results.length) t = setTimeout(() => setShown((n) => n + 1), shown === 0 ? 350 : 180);
    else if (!added) t = setTimeout(() => setAdded(true), 900);
    else
      t = setTimeout(() => {
        setSrc((s) => (s + 1) % SOURCES.length);
        setTyped(0);
        setShown(0);
        setAdded(false);
      }, 2400);
    return () => clearTimeout(t);
  }, [active, typed, shown, added, source]);

  const pick = (i: number) => {
    setSrc(i);
    setTyped(0);
    setShown(0);
    setAdded(false);
  };

  // Reduced motion: show the finished state of the chosen source.
  const view = reduce ? { typed: source.query.length, shown: source.results.length, added: true } : { typed, shown, added };
  const typing = view.typed < source.query.length;

  return (
    <div ref={ref} className="flex h-full flex-col">
      <div className="lg-glass flex h-12 items-center gap-3 rounded-xl px-4">
        <Search className="h-4 w-4 shrink-0 text-on-surface-variant" />
        <span className="truncate text-sm text-on-surface">
          {source.query.slice(0, view.typed)}
          {typing && <span className="animate-blink ml-px inline-block h-4 w-px translate-y-0.5 bg-primary-container" />}
        </span>
        <span className="ml-auto shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs text-primary-container">{source.name}</span>
      </div>

      <ul className="mt-3 flex min-h-[11.5rem] flex-col gap-2" aria-live="polite">
        <AnimatePresence mode="popLayout" initial={false}>
          {source.results.slice(0, view.shown).map((r, i) => (
            <motion.li
              key={`${src}-${r.title}`}
              layout
              initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
              transition={springs.gentle}
              className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-on-surface">{r.title}</p>
                <p className="truncate text-xs text-on-surface-variant">{r.meta}</p>
              </div>
              {i === 0 ? (
                <motion.span
                  layout
                  transition={springs.snappy}
                  className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium ${
                    view.added ? "bg-success/15 text-success" : "bg-primary-container text-on-primary"
                  }`}
                >
                  {view.added ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {view.added ? "In pipeline" : "Add"}
                </motion.span>
              ) : (
                <span className="flex shrink-0 items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1 text-xs text-on-surface-variant">
                  <Plus className="h-3.5 w-3.5" /> Add
                </span>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <div role="group" aria-label="Lead sources" className="mt-auto flex flex-wrap gap-2 pt-5">
        {SOURCES.map((s, i) => (
          <button
            key={s.name}
            type="button"
            onClick={() => pick(i)}
            aria-pressed={i === src}
            className={`relative rounded-full px-3.5 py-1.5 text-sm transition-[background-color] ${focusRing} ${
              i === src ? "text-on-primary" : "lg-glass-pill text-on-surface hover:bg-white/10"
            }`}
          >
            {i === src && <motion.span layoutId="scraper-source" transition={springs.layout} className="absolute inset-0 rounded-full bg-primary-container" />}
            <span className="relative">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Pipeline ───────────────────────────────────────────────────────────── */

const STAGES = ["New", "Contacted", "Interested", "Converted", "Closed"];

export function PipelineDemo() {
  const { ref, active, reduce } = useLoopActive();
  const [stage, setStage] = useState(0);
  const valueRef = useRef<HTMLSpanElement>(null);
  const current = reduce ? STAGES.length - 1 : stage;
  const won = current === STAGES.length - 1;

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setStage((s) => (s + 1) % STAGES.length), stage === STAGES.length - 1 ? 2600 : 1300);
    return () => clearTimeout(t);
  }, [active, stage]);

  // Count the deal value up when it closes; DOM text only, no re-renders.
  useEffect(() => {
    const el = valueRef.current;
    if (!el) return;
    if (!won) {
      el.textContent = "₹0";
      return;
    }
    if (reduce) {
      el.textContent = "₹36,000";
      return;
    }
    const controls = animate(0, 36000, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = `₹${Math.round(v).toLocaleString("en-IN")}`),
    });
    return () => controls.stop();
  }, [won, reduce]);

  return (
    <div ref={ref}>
      <ol className="flex flex-col gap-1.5">
        {STAGES.map((s, i) => (
          <li key={s} className="relative flex h-10 items-center justify-between rounded-lg px-3 text-sm">
            {i === current && (
              <motion.span layoutId="pipeline-pill" transition={springs.layout} className="lg-glass absolute inset-0 rounded-lg !border-primary/40" />
            )}
            <span className={`relative ${i <= current ? "text-on-surface" : "text-on-surface-variant/70"}`}>{s}</span>
            {i === current && (
              <motion.span initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="relative text-xs font-medium text-primary-container">
                Bloom Bakery
              </motion.span>
            )}
          </li>
        ))}
      </ol>
      <p className="mt-5 flex items-baseline justify-between border-t border-white/[0.06] pt-4 text-sm text-on-surface-variant">
        Won this month
        <span ref={valueRef} className={`font-mono text-lg tabular-nums ${won ? "text-success" : "text-on-surface-variant"}`}>
          ₹0
        </span>
      </p>
    </div>
  );
}

/* ─── Template deck (drag to browse) ─────────────────────────────────────── */

const TEMPLATES = [
  { name: "Proposal sent", body: ["Hi ", "{Arjun}", ", here's my proposal for ", "{Bloom Bakery}", ". Tap below to view it or book a call."] },
  { name: "Meeting reminder", body: ["Reminder: our call is tomorrow at ", "{11 AM}", ". The link is in your invite."] },
  { name: "Invoice sent", body: ["Invoice ", "{INV-0142}", " for ", "{₹18,000}", " is ready. Pay by UPI or card from the link."] },
  { name: "Payment received", body: ["Payment received, thank you! Next update by ", "{Friday}", "."] },
  { name: "Testimonial request", body: ["Loved working with you, ", "{Arjun}", ". Would you share a two-line review?"] },
];

const SWIPE_OFFSET = 80;
const SWIPE_VELOCITY = 400;

function TemplateCard({ t }: { t: (typeof TEMPLATES)[number] }) {
  return (
    <div className="h-full rounded-2xl border border-white/10 bg-[#1b2a28] p-5 shadow-[0_18px_40px_-20px_rgb(0_0_0/0.8)]">
      <p className="text-xs font-medium text-[#8fd1bf]">{t.name}</p>
      <p className="mt-3 text-[15px] leading-relaxed text-[#e9edef]">
        {t.body.map((part, i) =>
          part.startsWith("{") ? (
            <span key={i} className="rounded bg-primary/20 px-1 text-primary-container">
              {part.slice(1, -1)}
            </span>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </p>
    </div>
  );
}

export function TemplateDeck() {
  const { ref, active } = useLoopActive();
  const [order, setOrder] = useState(() => TEMPLATES.map((_, i) => i));
  const [touched, setTouched] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-220, 220], [-9, 9]);
  const busy = useRef(false);

  const advance = async (dir: 1 | -1) => {
    if (busy.current) return;
    busy.current = true;
    await animate(x, dir * 420, { duration: 0.28, ease: [0.4, 0, 1, 1] });
    setOrder((o) => [...o.slice(1), o[0]]);
    x.set(0);
    busy.current = false;
  };

  // Browse on its own until someone drags or presses Next.
  useEffect(() => {
    if (!active || touched) return;
    const t = setTimeout(() => advance(1), 3200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, touched, order]);

  const visible = order.slice(0, 3);

  return (
    <div ref={ref}>
      <div className="relative h-44">
        {[...visible].reverse().map((idx) => {
          const depth = visible.indexOf(idx);
          const t = TEMPLATES[idx];
          if (depth === 0) {
            return (
              <motion.div
                key={t.name}
                className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.9}
                style={{ x, rotate }}
                onDragStart={() => setTouched(true)}
                onDragEnd={(_, info) => {
                  const right = info.offset.x > SWIPE_OFFSET || info.velocity.x > SWIPE_VELOCITY;
                  const left = info.offset.x < -SWIPE_OFFSET || info.velocity.x < -SWIPE_VELOCITY;
                  if (right) advance(1);
                  else if (left) advance(-1);
                }}
                whileDrag={{ scale: 1.02 }}
              >
                <TemplateCard t={t} />
              </motion.div>
            );
          }
          return (
            <motion.div
              key={t.name}
              className="pointer-events-none absolute inset-0"
              animate={{ scale: 1 - depth * 0.05, y: depth * 12, opacity: 1 - depth * 0.35 }}
              transition={springs.layout}
              aria-hidden
            >
              <TemplateCard t={t} />
            </motion.div>
          );
        })}
      </div>
      <div className="mt-8 flex items-center justify-between text-sm text-on-surface-variant">
        <span>Drag the card to browse</span>
        <button
          type="button"
          onClick={() => {
            setTouched(true);
            advance(1);
          }}
          className={`lg-glass-pill flex items-center gap-1 rounded-full px-3 py-1.5 text-on-surface transition-colors hover:bg-white/10 active:scale-[0.97] ${focusRing}`}
        >
          Next <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/* ─── Solo price ─────────────────────────────────────────────────────────── */

export function SoloPrice() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || !inView || reduce) return;
    const controls = animate(0, 299, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => (el.textContent = `₹${Math.round(v)}`),
    });
    return () => controls.stop();
  }, [inView, reduce]);

  return (
    <span ref={ref} className="text-6xl font-semibold tracking-tight tabular-nums">
      ₹299
    </span>
  );
}

