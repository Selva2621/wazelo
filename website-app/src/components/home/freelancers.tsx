"use client";

// Freelancer section: one panel per job (find, pitch, templates, follow up,
// get paid). On desktop the panels pan sideways while the section is pinned;
// on small screens and with reduced motion they simply stack.

import { useRef, type ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { LeadScraperDemo, PipelineDemo, SoloPrice, TemplateDeck } from "@/components/home/freelancer-demos";
import { ProposalLoopPhone } from "@/components/mocks/phone-chats";
import { Incoming, Outgoing, PhoneFrame, Time } from "@/components/mocks/phone-frame";
import { gsap, ScrollTrigger, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { Illustration } from "@/components/illustration";

const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container";

/* ─── Mock frames ────────────────────────────────────────────────────────── */

function BrowserFrame({ url, children }: { url: string; children: ReactNode }) {
  return (
    <div className="lg-glass overflow-hidden rounded-2xl">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-3 truncate rounded-md bg-white/[0.05] px-3 py-1 font-mono text-xs text-on-surface-variant">{url}</span>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

/** The client's phone receiving a three-step follow-up sequence. */
function SequencePhone() {
  return (
    <PhoneFrame contact={{ name: "Riya Kapoor", initials: "RK", subtitle: "UI/UX designer", verified: true }}>
      <div className="flex flex-col gap-1.5">
        <span data-seq className="self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption text-[var(--wa-meta)]">Day 0</span>
        <div data-seq className="flex flex-col">
          <Incoming>
            Hi Arjun! Here&apos;s my portfolio, with two bakery sites I built last year.
            <Time>10:38</Time>
          </Incoming>
        </div>
        <span data-seq className="mt-1 self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption text-[var(--wa-meta)]">Day 2</span>
        <div data-seq className="flex flex-col">
          <Incoming>
            Just checking in. Happy to share a quick idea for the homepage if useful.
            <Time>11:02</Time>
          </Incoming>
        </div>
        <div data-seq className="flex flex-col">
          <Outgoing>
            Yes please, send it over!
            <Time read>11:20</Time>
          </Outgoing>
        </div>
        <span data-seq className="self-center rounded-md bg-[var(--wa-chip)] px-2 py-0.5 text-caption text-[var(--wa-meta)]">Sequence stopped: client replied</span>
      </div>
    </PhoneFrame>
  );
}

/* ─── Panels ─────────────────────────────────────────────────────────────── */

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div data-panel className={`flex w-full shrink-0 items-center py-12 lg:h-[100dvh] lg:w-[min(84vw,1120px)] lg:py-0 lg:pr-16 ${className}`}>
      {children}
    </div>
  );
}

function Copy({ step, title, text, art, children }: { step: string; title: string; text: string; art?: string; children?: ReactNode }) {
  return (
    <div data-pan="copy" className="max-w-md">
      <p className="font-mono text-xs text-primary-container">{step}</p>
      <h3 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-on-surface md:text-4xl">{title}</h3>
      <p className="mt-4 text-base leading-relaxed text-on-surface-variant">{text}</p>
      {art && <Illustration name={art} className="mt-8 h-36 w-full max-w-[16rem] lg:h-44" />}
      {children}
    </div>
  );
}

export function Freelancers() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Desktop: pin and pan the track sideways, 1:1 with scroll.
      mm.add(MQ_FULL, () => {
        const el = track.current!;
        const distance = () => Math.max(0, el.scrollWidth - window.innerWidth);
        const pan = gsap.to(el, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            pin: true,
            // Before ordinary triggers below, whose starts depend on this pin's length.
            refreshPriority: 1,
            start: "top top",
            end: () => `+=${distance()}`,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        // Each panel's copy and mock arrive as it slides into view.
        gsap.utils.toArray<HTMLElement>("[data-panel]").forEach((panel, i) => {
          if (i === 0) return;
          gsap.from(panel.querySelectorAll("[data-pan]"), {
            y: 50,
            autoAlpha: 0,
            stagger: 0.12,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: { trigger: panel, containerAnimation: pan, start: "left 75%", toggleActions: "play none none reverse" },
          });
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
        <span className="bottom-0 left-1/4 h-72 w-[36rem] bg-[#24403b]/50" />
      </div>

      <div ref={track} className="relative flex flex-col px-4 will-change-transform sm:px-6 lg:w-max lg:flex-row lg:px-[max(2rem,calc((100vw-80rem)/2+2rem))]">
        {/* 0: intro */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div data-pan="copy">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary-container">For freelancers</p>
            <h2 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-6xl">Your whole client business, in one WhatsApp inbox.</h2>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-on-surface-variant">
              Pick “Solo / Freelancer” when you sign up. Five jobs, one place: find, pitch, template, follow up, get paid.
            </p>
            <a href="#pricing" className={`group mt-9 inline-flex items-center gap-3 rounded-full ${focusRing}`}>
              <span className="lg-glass-pill rounded-full px-5 py-3 text-sm text-on-surface">
                Solo plan, <span className="font-semibold">₹299</span> a month
              </span>
              <ArrowRight className="h-5 w-5 text-primary-container transition-transform group-hover:translate-x-1" />
            </a>
          </div>
          <Illustration name="freelancer-intro" label="A freelancer working from a laptop" className="mx-auto h-64 w-full max-w-md lg:h-80" />
          </div>
        </Panel>

        {/* 1: find */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <Copy step="Find" art="find" title="Lead Scraper does the searching." text="Google Maps, Upwork Jobs, Freelancer.in, Truelancer and LinkedIn Jobs. Add a lead and it lands in your pipeline with contact details." />
            <div data-pan="mock">
              <BrowserFrame url="app.wazelo.in/leads/scraper">
                <LeadScraperDemo />
              </BrowserFrame>
            </div>
          </div>
        </Panel>

        {/* 2: pitch */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-2">
            <Copy step="Pitch" art="pitch" title="Proposals the client can act on." text="Send a proposal template with View and Book a call buttons. Clients answer in one tap, right inside WhatsApp." />
            <div data-pan="mock" className="relative mx-auto w-max">
              <div aria-hidden className="device-glow" />
              <ProposalLoopPhone />
            </div>
          </div>
        </Panel>

        {/* 3: templates */}
        <Panel>
          <div className="grid w-full items-center gap-10 lg:grid-cols-2">
            <Copy step="Template" art="template" title="26 templates, ready on day one." text="Proposal sent, meeting reminder, invoice sent, payment received, testimonial request and more, written for client work." />
            <div data-pan="mock" className="lg-glass w-full max-w-md rounded-3xl p-6 sm:p-8">
              <TemplateDeck />
            </div>
          </div>
        </Panel>

        {/* 4: follow up */}
        <Panel>
          <div data-seq-panel className="grid w-full items-center gap-10 lg:grid-cols-2">
            <Copy step="Follow up" art="follow-up" title="Follow-ups that know when to stop." text="A sequence nudges on day 0, 2 and 5, and stops by itself the moment the client replies." />
            <div data-pan="mock" className="relative mx-auto w-max">
              <div aria-hidden className="device-glow" />
              <SequencePhone />
            </div>
          </div>
        </Panel>

        {/* 5: get paid */}
        <Panel className="lg:pr-[max(2rem,calc((100vw-80rem)/2+2rem))]">
          <div className="grid w-full items-center gap-6 lg:grid-cols-2">
            <div data-pan="mock" className="lg-glass rounded-3xl p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-xs text-primary-container">Get paid</p>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-on-surface">Watch the deal move.</h3>
                </div>
                <Illustration name="get-paid" className="h-20 w-28 shrink-0" />
              </div>
              <div className="mt-6">
                <PipelineDemo />
              </div>
            </div>
            <div data-pan="mock" className="relative overflow-hidden rounded-3xl p-6 sm:p-8">
              <div aria-hidden className="absolute inset-0 bg-[radial-gradient(28rem_18rem_at_20%_10%,#f59e0b_0%,rgb(217_119_6/0.55)_40%,transparent_75%)]" />
              <div className="lg-glass absolute inset-0 rounded-3xl" />
              <div className="relative">
                <h3 className="text-xl font-semibold tracking-tight text-on-surface">Solo plan</h3>
                <p className="mt-6 flex items-baseline gap-1.5 text-on-surface">
                  <SoloPrice />
                  <span className="text-sm text-on-surface-variant">/month</span>
                </p>
                <ul className="mt-6 flex flex-col gap-2.5 text-sm">
                  {["1 user and 1 WhatsApp number", "3,000 messages a month", "Lead Scraper, pipeline, sequences", "14-day free trial, no card"].map((f) => (
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
    </section>
  );
}
