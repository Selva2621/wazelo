"use client";

import { useRef } from "react";
import { ArrowRight } from "lucide-react";
import { LaptopFrame } from "@/components/mocks/laptop-frame";
import { ScanStoryLaptopScreen, ScanStoryPhone, useScanStory } from "@/components/mocks/scan-story";
import { useLoopActive } from "@/components/home/use-loop";
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

function joinWords(nodes: React.ReactNode[]) {
  return nodes.reduce<React.ReactNode[]>((acc, el, i) => (i ? [...acc, " ", el] : [el]), []);
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  // One clock for both devices: scan the QR, get connected, find a lead, message it.
  const { ref: stage, active, reduce } = useLoopActive(0.3);
  const step = useScanStory(active, reduce);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // Entrance: words rise, the button follows, the laptop opens toward you, the phone slides in.
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "power3.out", duration: 0.9 } })
          .from("[data-hero=word]", { yPercent: 110, stagger: 0.07, duration: 1 })
          .from("[data-hero=cta]", { y: 16, autoAlpha: 0 }, "-=0.5")
          .from(
            "[data-hero=laptop]",
            { y: 70, rotationX: 24, autoAlpha: 0, transformPerspective: 1400, transformOrigin: "50% 100%", duration: 1.3 },
            0.3,
          )
          .from("[data-hero=phone]", { x: 90, autoAlpha: 0, duration: 1.1 }, 0.6);
      });

      // Leaving the hero: the headline lifts away fastest, then the phone, then the
      // laptop (furthest back), so the layers separate in depth.
      mm.add(MQ_FULL, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.8 } })
          .to("[data-hero=copy]", { y: -160, autoAlpha: 0.15, ease: "none" }, 0)
          .to("[data-hero=cta]", { y: -100, autoAlpha: 0, ease: "none" }, 0)
          .to("[data-hero=laptop-drift]", { y: -40, scale: 0.96, ease: "none" }, 0)
          .to("[data-hero=phone-drift]", { y: -130, ease: "none" }, 0);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden">
      <div aria-hidden className="site-aurora" />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-7xl flex-col px-4 pb-16 pt-28 sm:px-6 lg:px-8 lg:pb-10 lg:pt-24">
        <h1
          data-hero="copy"
          className="text-[clamp(2.125rem,9.6vw,2.75rem)] font-semibold leading-[0.95] tracking-tighter text-on-surface sm:text-[4rem] lg:text-[clamp(4.5rem,7.6vw,7.5rem)]"
        >
          <span className="block">{joinWords(LINE_1.map((w) => <Word key={w}>{w}</Word>))}</span>
          <span className="block lg:whitespace-nowrap">
            {joinWords(
              LINE_2.map(({ w, accent }) => (
                <Word key={w} accent={accent}>
                  {w}
                </Word>
              )),
            )}
          </span>
        </h1>

        <div className="mt-10 grid flex-1 items-start gap-14 lg:mt-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-10">
          <a
            data-hero="cta"
            href={APP_REGISTER_URL}
            className="group inline-flex w-max items-center gap-2 rounded-full bg-primary-container px-7 py-4 text-base font-semibold text-on-primary transition-colors duration-200 hover:bg-primary active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container lg:mt-6"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
          </a>

          {/* stage: Wazelo on the laptop, WhatsApp on the phone in front of its
              right edge, both on the same story clock. Mobile shows the phone only. */}
          <div ref={stage} className="relative flex justify-center lg:items-start">
            <div data-hero="laptop-drift" className="hidden w-[34rem] will-change-transform lg:block xl:w-[42rem]">
              <div data-hero="laptop">
                <LaptopFrame>
                  <ScanStoryLaptopScreen step={step} />
                </LaptopFrame>
              </div>
            </div>

            <div data-hero="phone-drift" className="relative z-10 will-change-transform lg:-ml-28 lg:mt-10">
              <div data-hero="phone" className="relative lg:origin-top-right lg:scale-[0.86] xl:scale-100">
                <div aria-hidden className="device-glow" />
                <ScanStoryPhone step={step} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
