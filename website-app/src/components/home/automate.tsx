"use client";

// "Runs while you're busy": the automation side of Wazelo as a bento, one cell
// per real feature (reference/website-product-facts.md). Cells reveal in a batch
// on scroll; the rule chain in the first cell lights up step by step while it is
// on screen, which is what a rule does: a trigger, then its actions in order.

import { useRef } from "react";
import Link from "next/link";
import { ArrowUpRight, Bot, CalendarClock, Code2, Megaphone, MessageCircle, Sparkles, UserPlus, Workflow, type LucideIcon } from "lucide-react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";

function Cell({
  icon: Icon,
  title,
  text,
  href,
  className = "",
  children,
}: {
  icon: LucideIcon;
  title: string;
  text: string;
  href?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const body = (
    <>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary-container">
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="flex items-center gap-1.5 font-semibold text-on-surface">
            {title}
            {href && <ArrowUpRight className="h-4 w-4 text-on-surface-variant transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-on-surface-variant">{text}</p>
        </div>
      </div>
      <div className="mt-6 flex flex-1 items-end">{children}</div>
    </>
  );
  const base = `group flex flex-col rounded-2xl border border-outline-variant p-6 ${className}`;
  return href ? (
    <Link
      data-bento
      href={href}
      className={`${base} transition-colors duration-200 hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container`}
    >
      {body}
    </Link>
  ) : (
    <div data-bento className={base}>
      {body}
    </div>
  );
}

/* Small pieces of real app UI, shown inside the cells. */

const RULE = [
  { k: "When", v: "No reply for 24 hours" },
  { k: "Then", v: "Send template “Follow-up 1”" },
  { k: "Then", v: "Add tag “warm”" },
];

function RuleChain() {
  return (
    <ol aria-hidden className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
      {RULE.map(({ k, v }, i) => (
        <li key={v} className="flex items-center gap-2 sm:flex-1">
          <div data-rule-step className="flex-1 rounded-xl border border-outline-variant bg-surface-container-lowest px-3.5 py-3 transition-colors duration-300 data-[lit=true]:border-primary-container data-[lit=true]:bg-primary/10">
            <p className="text-[11px] font-medium text-on-surface-variant">{k}</p>
            <p className="mt-0.5 text-sm font-medium text-on-surface">{v}</p>
          </div>
          {i < RULE.length - 1 && <span className="hidden h-px w-4 bg-outline sm:block" />}
        </li>
      ))}
    </ol>
  );
}

const CAMPAIGN = [
  { label: "Sent", value: "1,240" },
  { label: "Delivered", value: "1,198" },
  { label: "Read", value: "873" },
  { label: "Failed", value: "12" },
];

export function Automate() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.set("[data-bento]", { y: 28, autoAlpha: 0 });
        ScrollTrigger.batch("[data-bento]", {
          start: "top 88%",
          once: true,
          onEnter: (els) => gsap.to(els, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.7, ease: "power3.out" }),
        });

        // Rule chain: light each step in turn, hold, reset. Plays only while visible.
        const steps = gsap.utils.toArray<HTMLElement>("[data-rule-step]");
        const tl = gsap.timeline({ repeat: -1, repeatDelay: 0.6, paused: true });
        steps.forEach((s, i) => tl.call(() => (s.dataset.lit = "true"), [], i * 0.7));
        tl.call(() => steps.forEach((s) => (s.dataset.lit = "false")), [], steps.length * 0.7 + 1.6);
        ScrollTrigger.create({
          trigger: "[data-rule-chain]",
          start: "top bottom",
          end: "bottom top",
          onToggle: (self) => (self.isActive ? tl.play() : tl.pause()),
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.utils.toArray<HTMLElement>("[data-rule-step]").forEach((s) => (s.dataset.lit = "true"));
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} id="features" className="scroll-mt-16 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-tighter text-on-surface md:text-5xl">
          Runs while you&apos;re busy.
        </h2>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          {/* row 1 */}
          <Cell
            icon={Workflow}
            title="Automation rules"
            text="Pick a trigger, chain the actions. Included from the Growth plan."
            href="/features/automation"
            className="bg-primary/[0.06] md:col-span-2 lg:col-span-4"
          >
            <div data-rule-chain className="w-full">
              <RuleChain />
            </div>
          </Cell>
          <Cell icon={Bot} title="Chatbot" text="Start from AI, or draw your own flow." href="/features/chatbot" className="bg-surface-container-lowest lg:col-span-2">
            <div aria-hidden className="grid w-full gap-2">
              <span className="flex items-center gap-2 rounded-xl bg-primary-container px-3.5 py-2.5 text-sm font-medium text-on-primary">
                <Sparkles className="h-4 w-4" /> Create AI Chatbot
              </span>
              <span className="rounded-xl border border-outline-variant px-3.5 py-2.5 text-sm font-medium text-on-surface">Create Custom Flow</span>
            </div>
          </Cell>

          {/* row 2 */}
          <Cell icon={Megaphone} title="Campaigns" text="Broadcast to a segment. Pause any time." href="/features/campaigns" className="bg-surface-container-lowest lg:col-span-2">
            {/* sample numbers */}
            <dl aria-hidden className="grid w-full grid-cols-4 gap-2">
              {CAMPAIGN.map((c) => (
                <div key={c.label}>
                  <dd className="text-lg font-semibold tabular-nums text-on-surface">{c.value}</dd>
                  <dt className="text-[11px] text-on-surface-variant">{c.label}</dt>
                </div>
              ))}
            </dl>
          </Cell>
          <Cell icon={CalendarClock} title="Scheduled messages" text="Write it now, send it when they are awake." className="bg-surface-container-lowest lg:col-span-2">
            <div aria-hidden className="w-full rounded-xl bg-[var(--wa-out)] px-3.5 py-2.5 text-sm text-[var(--wa-text)]">
              Your order is ready for pickup.
              <span className="mt-1.5 flex items-center gap-1 text-[11px] text-[var(--wa-meta)]">
                <CalendarClock className="h-3 w-3" /> Tue, 9:00 AM
              </span>
            </div>
          </Cell>
          <Cell icon={MessageCircle} title="Website chat widget" text="One script tag. Visitors land in your inbox." className="bg-surface-container-lowest md:col-span-2 lg:col-span-2">
            <div aria-hidden className="flex w-full items-end justify-end gap-2">
              <span className="rounded-2xl rounded-br-sm bg-surface-container-high px-3 py-2 text-sm text-on-surface">Do you deliver to Adyar?</span>
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-container text-on-primary shadow-modal">
                <MessageCircle className="h-5 w-5" />
              </span>
            </div>
          </Cell>

          {/* row 3 */}
          <Cell icon={UserPlus} title="Meta lead ads" text="Leads from Facebook and Instagram ads become contacts, shared round-robin." className="bg-surface-container-lowest lg:col-span-3">
            <div aria-hidden className="flex w-full items-center gap-3">
              <span className="rounded-xl border border-outline-variant bg-surface-container-low px-3.5 py-2.5 text-sm font-medium text-on-surface">New lead: Divya S.</span>
              <span className="h-px flex-1 bg-outline-variant" />
              <span className="flex -space-x-2">
                {["MJ", "AV", "SK"].map((p, i) => (
                  <span key={p} style={{ zIndex: 3 - i }} className={`relative grid size-9 place-items-center rounded-full text-[11px] font-semibold ring-2 ring-surface ${i === 0 ? "bg-primary-container text-on-primary" : "bg-surface-container-high text-on-surface-variant"}`}>
                    {p}
                  </span>
                ))}
              </span>
            </div>
          </Cell>
          <Cell
            icon={Code2}
            title="Developer API"
            text="API keys to send messages and sync contacts. Webhooks for 11 events."
            href="/features/developer-api"
            className="bg-[#12151c] md:col-span-2 lg:col-span-3 [&_h3]:text-[#e8eaed] [&_p]:text-[#a3aabb]"
          >
            <pre aria-hidden className="w-full overflow-hidden rounded-xl bg-black/30 px-4 py-3 font-mono text-[12px] leading-relaxed text-[#e8eaed]">
              <span className="text-[#f59e0b]">POST</span> /api/v1/developer/messages/send{"\n"}
              {"{ "}<span className="text-[#86efac]">&quot;to&quot;</span>: <span className="text-[#7dd3fc]">&quot;+919876543210&quot;</span>, <span className="text-[#86efac]">&quot;body&quot;</span>: <span className="text-[#7dd3fc]">&quot;Order shipped&quot;</span>{" }"}
            </pre>
          </Cell>
        </div>
      </div>
    </section>
  );
}
