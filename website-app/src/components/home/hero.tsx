"use client";

import { useRef } from "react";
import { ArrowRight, CheckCheck, UserPlus } from "lucide-react";
import { LaptopFrame } from "@/components/mocks/laptop-frame";
import { TeamScreen } from "@/components/mocks/app-screens";
import { ProposalLoopPhone } from "@/components/mocks/phone-chats";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";

const LINE_1 = ["WhatsApp", "CRM", "for"];
const LINE_2 = [
  { w: "freelancers", accent: true },
  { w: "and", accent: false },
  { w: "teams.", accent: true },
];

/** One word inside an overflow mask, so it can rise into view. */
function Word({ children, accent }: { children: string; accent?: boolean }) {
  return (
    <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
      <span data-hero="word" className={`inline-block ${accent ? "text-primary-container" : ""}`}>
        {children}
      </span>
    </span>
  );
}

export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Entrance: words rise, copy follows, devices settle in.
      mm.add(MQ_MOTION, () => {
        const tl = gsap.timeline({ defaults: { ease: "power3.out", duration: 0.9 } });
        tl.from("[data-hero=word]", { yPercent: 110, stagger: 0.06 })
          .from("[data-hero=sub]", { y: 16, autoAlpha: 0 }, "-=0.55")
          .from("[data-hero=cta]", { y: 16, autoAlpha: 0, stagger: 0.08 }, "<0.1")
          .from("[data-hero=laptop]", { y: 70, rotationX: 24, autoAlpha: 0, transformPerspective: 1400, transformOrigin: "50% 100%", duration: 1.3 }, 0.15)
          .from("[data-hero=phone]", { x: 90, autoAlpha: 0, duration: 1.1 }, 0.45)
          .from("[data-hero=chip]", { scale: 0.6, autoAlpha: 0, ease: "back.out(2)", duration: 0.6, stagger: 0.12 }, "-=0.35");
      });

      // Leaving the hero: devices drift at different speeds, copy fades back.
      mm.add(MQ_FULL, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.8 } })
          .to("[data-hero=laptop-drift]", { y: -60, scale: 0.94, ease: "none" }, 0)
          .to("[data-hero=phone-drift]", { y: -150, ease: "none" }, 0)
          .to("[data-hero=copy]", { y: -50, autoAlpha: 0.2, ease: "none" }, 0);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden">
      <div aria-hidden className="site-aurora" />
      <div className="relative mx-auto grid min-h-[100dvh] max-w-7xl items-center gap-14 px-4 pb-20 pt-28 sm:px-6 lg:grid-cols-12 lg:gap-6 lg:px-8 lg:pb-16 lg:pt-24">
        {/* copy */}
        <div data-hero="copy" className="lg:col-span-6">
          <h1 className="text-[2.5rem] font-semibold leading-[1.06] tracking-tight text-on-surface sm:text-5xl lg:text-[2.75rem] xl:text-[3.25rem]">
            <span className="block">
              {LINE_1.map((w) => (
                <Word key={w}>{w}</Word>
              )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " ", el] : [el]), [])}
            </span>
            <span className="block lg:whitespace-nowrap">
              {LINE_2.map(({ w, accent }) => (
                <Word key={w} accent={accent}>
                  {w}
                </Word>
              )).reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " ", el] : [el]), [])}
            </span>
          </h1>
          <p data-hero="sub" className="mt-6 max-w-[46ch] text-lg leading-relaxed text-on-surface-variant">
            Find clients, send proposals, share one inbox and run campaigns. Built on the official WhatsApp Business API.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              data-hero="cta"
              href={APP_REGISTER_URL}
              className="group inline-flex items-center gap-2 rounded-full bg-primary-container px-6 py-3.5 text-sm font-semibold text-on-primary transition-colors duration-200 hover:bg-primary active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </a>
            <a
              data-hero="cta"
              href="#stories"
              className="inline-flex items-center rounded-full border border-outline-variant px-6 py-3.5 text-sm font-semibold text-on-surface transition-colors hover:border-outline hover:bg-surface-container-lowest active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            >
              See how it works
            </a>
          </div>
        </div>

        {/* devices */}
        <div className="relative lg:col-span-6">
          {/* Bleeds off the right edge; the section clips it. */}
          <div data-hero="laptop-drift" className="hidden will-change-transform lg:block lg:w-[128%] xl:w-[132%]">
            <div data-hero="laptop">
              <LaptopFrame>
                <TeamScreen beat={2} revealed={2} />
              </LaptopFrame>
            </div>
          </div>

          <div data-hero="phone-drift" className="relative mx-auto w-max will-change-transform lg:absolute lg:-bottom-16 lg:right-[-10%] xl:right-[-14%]">
            <div data-hero="phone" className="relative lg:origin-bottom-right lg:scale-[0.74] xl:scale-[0.82]">
              <div aria-hidden className="device-glow" />
              <ProposalLoopPhone />

              {/* Same status chips as the app's sign-in page */}
              <div data-hero="chip" className="glass-panel absolute -right-6 -top-8 flex w-max items-center gap-2.5 rounded-xl py-2 pl-2 pr-3.5 sm:-right-20 lg:-left-28 lg:-top-10 lg:right-auto">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary-container">
                  <UserPlus className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-on-surface">New lead found</p>
                  <p className="text-[11px] text-on-surface-variant">Bloom Bakery, Chennai</p>
                </div>
              </div>
              <div data-hero="chip" className="glass-panel absolute -bottom-5 -left-6 flex w-max items-center gap-2.5 rounded-xl py-2 pl-2 pr-3.5 sm:-left-24 lg:hidden">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/15 text-primary-container">
                  <CheckCheck className="h-4 w-4" />
                </span>
                <div className="leading-tight">
                  <p className="text-xs font-semibold text-on-surface">Proposal viewed</p>
                  <p className="text-[11px] text-on-surface-variant">2 min ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
