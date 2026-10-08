"use client";

// Freelancer section: one panel per job (find, template, follow up,
// pipeline). On desktop the panels pan sideways while the section is pinned,
// a step rail tracks progress and scrolling settles on the nearest panel.
// On small screens and with reduced motion they simply stack.

import { useContext, useRef, type ReactNode } from "react";
import { ArrowDown, ArrowRight, Check } from "lucide-react";
import { LeadScraperDemo, PipelineDemo, SoloPrice, TemplateDeck } from "@/components/home/freelancer-demos";
import { Incoming, Outgoing, PhoneFrame, Time } from "@/components/mocks/phone-frame";
import { gsap, ScrollTrigger, SplitText, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { LenisContext } from "@/app/lenis-provider";
import { Illustration } from "@/components/illustration";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";
const gutter = "lg:motion-safe:px-[max(2rem,calc((100vw-80rem)/2+2rem))]";

const STEPS = ["Find", "Template", "Follow up", "Pipeline"];

/* ─── Mock frames ────────────────────────────────────────────────────────── */

function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="lg-glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-ink/[0.06] px-4 py-3">
        <span className="size-2.5 rounded-full bg-ink/15" />
        <span className="size-2.5 rounded-full bg-ink/15" />
        <span className="size-2.5 rounded-full bg-ink/15" />
        <span className="ml-3 truncate rounded-md bg-ink/[0.05] px-3 py-1 font-mono text-xs text-on-surface-variant">{url}</span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/** Riya's phone (linked to Wazelo): the sequence's messages go out from her
    number on their own, and Arjun's reply ends it. */
function SequencePhone() {
  return (
    <PhoneFrame contact={{ name: "Bloom Bakery", initials: "BB", subtitle: "Arjun Mehta" }}>
      <div className="flex flex-col gap-1.5">
        <span data-seq className="self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption uppercase text-[var(--wa-meta)]">Monday</span>
        <div data-seq className="flex flex-col">
          <Outgoing>
            Hi Arjun! Here&apos;s my portfolio, with two bakery sites I built last year.
            <Time read>10:38</Time>
          </Outgoing>
        </div>
        <span data-seq className="mt-1 self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption uppercase text-[var(--wa-meta)]">Wednesday</span>
        <div data-seq className="flex flex-col">
          <Outgoing>
            Just checking in. Happy to share a quick idea for the homepage if useful.
            <Time read>11:02</Time>
          </Outgoing>
        </div>
        <div data-seq className="flex flex-col">
          <Incoming>
            Yes please, send it over!
            <Time>11:20</Time>
          </Incoming>
        </div>
      </div>
    </PhoneFrame>
  );
}

/* ─── Panels ─────────────────────────────────────────────────────────────── */

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      data-panel
      className={`flex w-full shrink-0 items-center py-12 lg:motion-safe:h-[100dvh] lg:motion-safe:w-[min(84vw,1120px)] lg:motion-safe:py-0 lg:motion-safe:pb-20 lg:motion-safe:pr-16 ${className}`}
    >
      {children}
    </div>
  );
}

function StepLabel({ n }: { n: number }) {
  return (
    <p data-step-label className="flex items-center gap-2 font-mono text-xs text-primary-container">
      <span>{String(n).padStart(2, "0")}</span>
      <span aria-hidden className="h-px w-6 bg-primary-container/40" />
      <span>{STEPS[n - 1]}</span>
    </p>
  );
}

function Copy({ n, title, text, art }: { n: number; title: string; text: string; art?: string }) {
  return (
    <div data-pan="copy" className="max-w-md">
      <StepLabel n={n} />
      <h3 data-split className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-on-surface md:text-4xl">
        {title}
      </h3>
      <p data-text className="mt-4 text-base leading-relaxed text-on-surface-variant">
        {text}
      </p>
      {art && (
        <div data-art className="mt-8 w-full max-w-[16rem]">
          <Illustration name={art} className="h-36 w-full lg:h-44" />
        </div>
      )}
    </div>
  );
}

/* ─── Step rail (desktop) ────────────────────────────────────────────────── */

function StepRail({ onPick, onSkip }: { onPick: (k: number) => void; onSkip: () => void }) {
  return (
    <nav aria-label="Freelancer steps" data-rail className={`pointer-events-none invisible absolute inset-x-0 bottom-8 z-10 hidden opacity-0 lg:motion-safe:block ${gutter}`}>
      <div className="flex items-center gap-3">
      <ol className="lg-glass-pill pointer-events-auto inline-flex gap-1 rounded-full p-1.5">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              data-step={i + 1}
              onClick={() => onPick(i + 1)}
              className={`flex min-w-[7.5rem] flex-col gap-2 rounded-full px-4 pb-2 pt-2.5 text-left text-sm text-on-surface-variant transition-colors hover:text-on-surface aria-[current=step]:text-on-surface ${focusRing}`}
            >
              <span className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary-container">{String(i + 1).padStart(2, "0")}</span>
                {s}
              </span>
              <span aria-hidden className="h-0.5 w-full overflow-hidden rounded-full bg-ink/10">
                <span data-fill className="block h-full origin-left scale-x-0 rounded-full bg-primary-container" />
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={onSkip}
        className={`lg-glass-pill pointer-events-auto group flex items-center gap-2 rounded-full px-4 py-3 text-sm text-on-surface transition-colors hover:bg-ink/10 ${focusRing}`}
      >
        Skip to next section
        <ArrowDown className="h-4 w-4 text-primary-container transition-transform group-hover:translate-y-0.5" />
      </button>
      </div>
    </nav>
  );
}

/* ─── Section ────────────────────────────────────────────────────────────── */

export function Freelancers() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const lenis = useContext(LenisContext);
  // Set while the desktop pan is live: scroll to panel k (0 = intro).
  const goTo = useRef<((k: number) => void) | null>(null);

  // Jump past the pinned pan to whatever follows the section. While pinned,
  // the section sits inside ScrollTrigger's pin-spacer, so look one level up.
  const skip = () => {
    const el = section.current;
    if (!el) return;
    const host = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
    const next = host.nextElementSibling as HTMLElement | null;
    if (!next) return;
    if (lenis.current) lenis.current.scrollTo(next, { offset: -64, duration: 1.1 });
    else next.scrollIntoView({ behavior: "smooth" });
  };

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop: pin and pan the track sideways, 1:1 with scroll.
      mm.add(MQ_FULL, () => {
        const el = track.current!;
        const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");
        const fills = gsap.utils.toArray<HTMLElement>("[data-fill]").map((f) => gsap.quickSetter(f, "scaleX"));
        const steps = gsap.utils.toArray<HTMLElement>("[data-step]");
        const distance = () => Math.max(0, el.scrollWidth - window.innerWidth);

        // Progress (0–1) at which each panel sits at the left gutter.
        let points: number[] = [];
        const measure = () => {
          const d = distance() || 1;
          points = panels.map((p) => gsap.utils.clamp(0, 1, (p.offsetLeft - panels[0].offsetLeft) / d));
        };

        let active = -1;
        const paint = (p: number) => {
          for (let k = 1; k < points.length; k++) {
            fills[k - 1]?.(gsap.utils.clamp(0, 1, gsap.utils.normalize(points[k - 1], points[k], p)));
          }
          const nearest = points.indexOf(gsap.utils.snap(points, p));
          if (nearest === active) return;
          active = nearest;
          steps.forEach((s, i) => (i + 1 === active ? s.setAttribute("aria-current", "step") : s.removeAttribute("aria-current")));
        };

        const pan = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          onUpdate() {
            paint(this.progress());
          },
          scrollTrigger: {
            trigger: section.current,
            pin: true,
            // Before ordinary triggers below, whose starts depend on this pin's length.
            refreshPriority: 1,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            invalidateOnRefresh: true,
            onRefresh: measure,
            onToggle: (self) => gsap.to("[data-rail]", { autoAlpha: self.isActive ? 1 : 0, y: self.isActive ? 0 : 16, duration: 0.35, ease: "power2.out" }),
          },
        });
        const st = pan.scrollTrigger!;
        gsap.set("[data-rail]", { autoAlpha: 0, y: 16 });

        const scrollTo = (y: number) => {
          if (lenis.current) lenis.current.scrollTo(y, { duration: 0.7 });
          else window.scrollTo({ top: y, behavior: "smooth" });
        };
        goTo.current = (k) => scrollTo(st.start + (points[k] ?? 0) * (st.end - st.start));

        // Settle on the nearest panel once scrolling stops inside the pin.
        // (Lenis owns the scroll, so this replaces ScrollTrigger's own snap.)
        const settle = () => {
          if (!st.isActive) return;
          const target = gsap.utils.snap(points, st.progress);
          if (Math.abs(target - st.progress) * (st.end - st.start) > 4) goTo.current?.(points.indexOf(target));
        };
        ScrollTrigger.addEventListener("scrollEnd", settle);

        // Intro headline rises word by word as the section arrives.
        const intro = SplitText.create("[data-intro-title]", { type: "words", mask: "words" });
        gsap
          .timeline({ scrollTrigger: { trigger: section.current, start: "top 70%", toggleActions: "play none none reverse" } })
          .from(intro.words, { yPercent: 110, duration: 0.9, stagger: 0.04, ease: "power4.out" })
          .from("[data-intro-rest]", { autoAlpha: 0, y: 24, duration: 0.7, stagger: 0.1, ease: "power3.out" }, "<0.3");

        // Each panel plays its own entrance as it slides into view.
        panels.forEach((panel, i) => {
          if (i === 0) return;
          const q = gsap.utils.selector(panel);
          const words = q("[data-split]").length ? SplitText.create(q("[data-split]"), { type: "words", mask: "words" }).words : [];
          gsap
            .timeline({
              defaults: { ease: "power3.out" },
              scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left 70%", toggleActions: "play none none reverse" },
            })
            .from(q("[data-pan='mock']"), { autoAlpha: 0, x: 140, rotate: 1.5, duration: 1.1, stagger: 0.15, ease: "expo.out" }, 0)
            .from(q("[data-step-label]"), { autoAlpha: 0, x: -16, duration: 0.5 }, 0.05)
            .from(words, { yPercent: 110, duration: 0.8, stagger: 0.035, ease: "power4.out" }, 0.1)
            .from(q("[data-text]"), { autoAlpha: 0, y: 20, duration: 0.6 }, 0.35)
            .from(q("[data-art]"), { autoAlpha: 0, scale: 0.85, duration: 0.8, ease: "back.out(1.6)" }, 0.45);

          // Illustrations drift against the pan for a little depth.
          if (q("[data-art]").length) {
            gsap.fromTo(
              q("[data-art]"),
              { x: 60 },
              { x: -60, ease: "none", scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left right", end: "right left", scrub: true } },
            );
          }
        });

        // Follow-up messages land one after another.
        gsap.from("[data-seq]", {
          y: 18,
          autoAlpha: 0,
          stagger: 0.35,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: { trigger: "[data-seq-panel]", containerAnimation: pan, start: "left 60%", toggleActions: "play none none reverse" },
        });

        return () => {
          ScrollTrigger.removeEventListener("scrollEnd", settle);
          goTo.current = null;
        };
      });

      // Stacked layout with motion allowed: simple reveals on vertical scroll.
      mm.add("(max-width: 1023px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-pan]").forEach((el) => {
          gsap.from(el, { y: 40, autoAlpha: 0, duration: 0.8, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 85%" } });
        });
        gsap.from("[data-seq]", { y: 18, autoAlpha: 0, stagger: 0.3, duration: 0.5, scrollTrigger: { trigger: "[data-seq-panel]", start: "top 70%" } });
      });

      // Keep later triggers in step once fonts settle.
      mm.add(MQ_MOTION, () => {
        document.fonts?.ready.then(() => ScrollTrigger.refresh());
      });
    },
    { scope: section },
  );

  return (
    <section ref={section} id="freelancers" className="relative scroll-mt-16 overflow-hidden">
      <div aria-hidden className="glass-stage">
        <span className="-left-20 top-1/4 h-96 w-96 bg-primary/25" />
        <span className="left-[60%] top-1/3 h-[28rem] w-[40rem] bg-primary-container/12" />
        <span className="bottom-0 left-1/4 h-72 w-[36rem] bg-wa-out/50" />
      </div>

      <div ref={track} className={`relative flex flex-col px-4 will-change-transform sm:px-6 lg:motion-safe:w-max lg:motion-safe:flex-row ${gutter}`}>
        {/* 0: intro */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div data-pan="copy">
              <p data-intro-rest className="text-xs font-medium uppercase tracking-[0.16em] text-primary-container">For freelancers</p>
              <h2 data-intro-title className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-6xl">
                Your whole client business, in one WhatsApp inbox.
              </h2>
              <p data-intro-rest className="mt-6 max-w-[52ch] text-lg leading-relaxed text-on-surface-variant">
                Pick “Solo / Freelancer” at signup. Find leads, message them, follow up, track every deal.
              </p>
              <a data-intro-rest href="#pricing" className={`group mt-9 inline-flex items-center gap-3 rounded-full ${focusRing}`}>
                <span className="lg-glass-pill rounded-full px-5 py-3 text-sm text-on-surface">
                  Solo plan, <span className="font-semibold">₹299</span> a month
                </span>
                <ArrowRight className="h-5 w-5 text-primary-container transition-transform group-hover:translate-x-1" />
              </a>
            </div>
            <div data-intro-rest>
              <Illustration name="freelancer-intro" label="A freelancer working from a laptop" className="mx-auto h-64 w-full max-w-md lg:h-80" />
            </div>
          </div>
        </Panel>

        {/* 1: find */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Copy n={1} art="find" title="Lead Scraper does the searching." text="Google Maps, Upwork Jobs, Freelancer.in, Truelancer and LinkedIn Jobs. Up to 200 results a run, imported to your contacts." />
            <div data-pan="mock">
              <BrowserFrame url="app.wazelo.in/leads/scraper">
                <LeadScraperDemo />
              </BrowserFrame>
            </div>
          </div>
        </Panel>

        {/* 2: templates and button messages */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-2">
            <Copy n={2} art="template" title="Templates with buttons." text="Save up to 20 templates on the Solo plan. Add buttons so clients answer in one tap." />
            <div data-pan="mock" className="lg-glass w-full max-w-md rounded-3xl p-6 sm:p-8">
              <TemplateDeck />
            </div>
          </div>
        </Panel>

        {/* 3: follow up */}
        <Panel>
          <div data-seq-panel className="grid w-full items-center gap-10 lg:grid-cols-2">
            <Copy n={3} art="follow-up" title="Follow-ups that know when to stop." text="Set the steps and the delays. The sequence stops by itself when the client replies." />
            <div data-pan="mock" className="relative mx-auto w-max">
              <div aria-hidden className="device-glow" />
              <SequencePhone />
            </div>
          </div>
        </Panel>

        {/* 4: pipeline + Solo price */}
        <Panel className="lg:motion-safe:pr-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <div className="grid w-full items-center gap-6 lg:grid-cols-2">
            <div data-pan="mock" className="lg-glass rounded-3xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <StepLabel n={4} />
                  <h3 data-split className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">
                    Drag each lead to its next stage.
                  </h3>
                </div>
                <Illustration name="success" className="h-20 w-28 shrink-0" />
              </div>
              <div className="mt-6">
                <PipelineDemo />
              </div>
            </div>
            <div data-pan="mock" className="relative overflow-hidden rounded-3xl p-6 sm:p-8">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(28rem_18rem_at_20%_10%,rgb(var(--fx-accent))_0%,rgb(var(--fx-accent)/0.55)_40%,transparent_75%)]" />
              <div className="lg-glass absolute inset-0 rounded-3xl" />
              <div className="relative">
                <h3 className="text-xl font-semibold tracking-tight text-on-surface">Solo plan</h3>
                <p className="mt-6 flex items-baseline gap-1.5 text-on-surface">
                  <SoloPrice />
                  <span className="text-sm text-on-surface-variant">/month</span>
                </p>
                <ul className="mt-6 flex flex-col gap-2.5 text-sm">
                  {[
                    "1 user and 1 WhatsApp number",
                    "3,000 messages a month",
                    "5 campaigns and 20 templates",
                    "Lead Scraper, pipeline, sequences",
                    "14-day free trial, no card",
                  ].map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-on-surface">
                      <Check className="h-4 w-4 shrink-0 text-primary-container" />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href="#pricing" className={`group mt-8 inline-flex items-center gap-2 rounded-full text-sm font-semibold text-on-surface underline-offset-4 hover:underline ${focusRing}`}>
                  Compare plans
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <StepRail onPick={(k) => goTo.current?.(k)} onSkip={skip} />
    </section>
  );
}
