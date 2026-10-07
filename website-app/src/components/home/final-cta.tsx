"use client";

import { useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LaptopFrame } from "@/components/mocks/laptop-frame";
import { FreelancerScreen } from "@/components/mocks/app-screens";
import { StoryPhone } from "@/components/mocks/phone-chats";
import { teamStory } from "@/components/home/stories";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { Illustration } from "@/components/illustration";

const LAST_BEAT = teamStory.beats.length - 1;

export function FinalCta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap.from("[data-cta=copy] > *", {
          y: 30,
          autoAlpha: 0,
          stagger: 0.12,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: root.current, start: "top 70%", once: true },
        });
      });
      // Desktop: both devices slide in from the sides, scrubbed to scroll.
      mm.add(MQ_FULL, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: "[data-cta=stage]", start: "top bottom", end: "center 65%", scrub: 1 } })
          .from("[data-cta=laptop]", { xPercent: -35, rotationY: 22, autoAlpha: 0, transformPerspective: 1600, ease: "none" }, 0)
          .from("[data-cta=phone]", { xPercent: 60, rotation: -8, autoAlpha: 0, ease: "none" }, 0);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative overflow-hidden px-4 pt-28 sm:px-6 lg:px-8 lg:pt-40">
      <div aria-hidden className="site-aurora opacity-80" />

      <div data-cta="copy" className="relative mx-auto max-w-3xl text-center">
        <Illustration name="success" label="A celebration after closing a deal" className="mx-auto mb-10 h-40 w-full max-w-xs" />
        <h2 className="text-4xl font-semibold leading-[1.05] tracking-tight text-on-surface md:text-6xl">Your next client is already on WhatsApp.</h2>
        <p className="mx-auto mt-6 max-w-[48ch] text-lg leading-relaxed text-on-surface-variant">Set up in minutes. Try every feature of your plan free for 14 days.</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <a
            href={APP_REGISTER_URL}
            className="group inline-flex items-center gap-2 rounded-full bg-primary-container px-7 py-4 text-sm font-semibold text-on-primary transition-colors hover:bg-[#fbbf24] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          >
            Start free trial
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </a>
          <Link
            href="/contact"
            className="inline-flex items-center rounded-full border border-outline-variant px-7 py-4 text-sm font-semibold text-on-surface transition-colors hover:border-outline active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
          >
            Talk to sales
          </Link>
        </div>
      </div>

      {/* devices, cropped by the section bottom like a desk edge */}
      <div data-cta="stage" className="relative mx-auto mt-20 max-w-6xl lg:mt-24">
        <div className="relative h-[24rem] overflow-hidden sm:h-[26rem] lg:h-[30rem]">
          <div data-cta="laptop" className="absolute left-0 top-0 hidden w-[78%] lg:block">
            <LaptopFrame>
              <FreelancerScreen beat={4} revealed={4} />
            </LaptopFrame>
          </div>
          <div data-cta="phone" className="absolute left-1/2 top-0 -translate-x-1/2 lg:left-auto lg:right-[4%] lg:translate-x-0">
            <div aria-hidden className="device-glow" />
            <StoryPhone story={teamStory} beat={LAST_BEAT} revealed={teamStory.beats[LAST_BEAT].chat.length} />
          </div>
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface to-transparent" />
      </div>
    </section>
  );
}
