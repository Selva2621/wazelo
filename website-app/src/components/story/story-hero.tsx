"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { LiveTime } from "./live-time";
import { ArrowRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { LoopVideo } from "@/components/home/loop-video";
import { HERO_STEPS } from "./hero-steps";

/**
 * Full-screen hero film (demo/blender-hero): a team office table with the real Wazelo app on
 * every screen; on the phone a lead is assigned, answered by AI and won. The 3D subjects sit
 * right of centre, so the headline owns the left half.
 */
// The interactive 3D scene: desktop, fine pointer, motion allowed and WebGL available.
// Everyone else keeps the rendered film, which also plays until the 3D scene is ready.
const Hero3D = dynamic(() => import("./hero-3d").then((m) => m.Hero3D), { ssr: false });
const DESKTOP_3D = "(min-width: 1024px) and (pointer: fine) and (prefers-reduced-motion: no-preference)";

function canUse3d() {
  if (!window.matchMedia(DESKTOP_3D).matches) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export function StoryHero() {
  const root = useRef<HTMLElement>(null);
  // null until mounted (we can't know the device on the server), then 3D or the film.
  const [use3d, setUse3d] = useState<boolean | null>(null);
  const [ready3d, setReady3d] = useState(false);
  const onReady3d = useCallback(() => setReady3d(true), []);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0); // bumps on a manual pick so the timer restarts
  const pick = useCallback((i: number) => {
    setStep(i);
    setCycle((c) => c + 1);
  }, []);
  useEffect(() => {
    setUse3d(canUse3d());
  }, []);
  // Auto-play the four beats once the 3D scene is showing.
  useEffect(() => {
    if (!ready3d) return;
    const id = window.setTimeout(() => setStep((s) => (s + 1) % HERO_STEPS.length), HERO_STEPS[step].ms);
    return () => window.clearTimeout(id);
  }, [ready3d, step, cycle]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.2 } })
          .from("[data-h=film]", { scale: 1.1, duration: 2.4, ease: "power2.out" }, 0)
          .from("[data-h=kicker]", { y: 14, autoAlpha: 0, duration: 0.8 }, 0.3)
          .from("[data-h=line]", { yPercent: 105, stagger: 0.12 }, 0.4)
          .from("[data-h=sub]", { y: 18, autoAlpha: 0 }, 0.9)
          .from("[data-h=cta]", { y: 18, autoAlpha: 0, stagger: 0.08 }, 1.0);
      });
      // Scrolling away: the film settles into a framed card and the copy lifts off.
      mm.add(MQ_FULL, () => {
        gsap
          .timeline({ scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: 0.6 } })
          .to("[data-h=frame]", { scale: 0.9, borderRadius: 36, ease: "none" }, 0)
          .to("[data-h=copy]", { yPercent: -35, autoAlpha: 0, ease: "none" }, 0);
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className="relative h-[100svh] min-h-[640px] overflow-hidden bg-ink">
      <div data-h="frame" className="absolute inset-0 overflow-hidden will-change-transform">
        {/* Phones: the whole 16:9 film sits at the top, uncropped, with the copy below it.
            Desktop: full-bleed behind the copy (the 3D scene, or the film without WebGL). */}
        <div data-h="film" className="absolute inset-x-0 top-20 aspect-video lg:inset-0 lg:aspect-auto">
          {/* Desktop starts straight in the 3D scene: the film is never loaded there. Phones get
              the poster at once and the rendered film after mount. */}
          {use3d === null && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/media/story/hero-cut.jpg"
              alt=""
              className="h-full w-full object-cover lg:hidden"
            />
          )}
          {use3d === false && (
            <LoopVideo
              src="/media/story/hero-cut.mp4"
              poster="/media/story/hero-cut.jpg"
              label="A team office desk: a new lead is assigned to Priya in Sales, Wazelo's AI replies, a proposal goes out and the customer accepts it."
              priority
              className="!aspect-auto h-full"
            />
          )}
          {use3d && (
            <Hero3D
              step={step}
              onStep={pick}
              onReady={onReady3d}
              className={`absolute inset-0 transition-opacity duration-1000 ${ready3d ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent lg:hidden" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(23,19,15,0.95)_0%,rgba(23,19,15,0.86)_38%,rgba(23,19,15,0.35)_50%,rgba(23,19,15,0)_60%)] lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/80 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/85 to-transparent lg:h-36" />
      </div>

      <div className="pointer-events-none relative mx-auto flex h-full max-w-7xl items-end px-4 pb-16 sm:px-6 lg:items-center lg:px-8 lg:pb-0">
        <div data-h="copy" className="pointer-events-auto max-w-xl">
          <p data-h="kicker" className="text-xs font-medium uppercase tracking-[0.22em] text-[#e9c9a6]">
            Wazelo · The lead follow-up platform
          </p>
          <h1 className="mt-6 font-display text-[clamp(3.4rem,7vw,6.75rem)] leading-[0.9] tracking-[-0.02em] text-paper">
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-h="line" className="block">
                <LiveTime />.
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <span data-h="line" className="block italic text-[#f0b483]">A customer is waiting.</span>
            </span>
          </h1>
          <p data-h="sub" className="mt-7 max-w-[38ch] text-lg leading-relaxed text-paper/75">
            Wazelo catches every lead, routes it to the right person on your team, replies in
            seconds with AI and follows up until they buy.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <a
              data-h="cta"
              href={APP_REGISTER_URL}
              className="group inline-flex items-center gap-2 rounded-full bg-paper px-7 py-4 text-sm font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              data-h="cta"
              href="#story"
              className="inline-flex items-center rounded-full border border-paper/30 px-7 py-4 text-sm font-semibold text-paper transition-colors hover:border-paper/60 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              How it works
            </a>
          </div>
        </div>
      </div>
      {use3d && ready3d && (
        <nav
          aria-label="How Wazelo works"
          className="absolute bottom-8 right-28 z-10 hidden lg:block"
        >
          <ol className="flex gap-1.5 rounded-full border border-white/10 bg-[#17130f]/90 p-1.5">
            {HERO_STEPS.map((s, i) => (
              <li key={s.chip}>
                <button
                  type="button"
                  onClick={() => pick(i)}
                  aria-current={i === step ? "step" : undefined}
                  className={`relative overflow-hidden rounded-full px-4 py-2 text-[13px] font-medium transition-colors ${
                    i === step ? "bg-paper text-ink" : "text-paper/70 hover:text-paper"
                  }`}
                >
                  <span className="mr-1.5 tabular-nums opacity-50">0{i + 1}</span>
                  {s.chip}
                  {i === step && (
                    <span
                      key={`${step}-${cycle}`}
                      aria-hidden
                      className="absolute inset-x-3 bottom-1 h-px origin-left bg-rust"
                      style={{ animation: `hero-step ${s.ms}ms linear forwards` }}
                    />
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
    </section>
  );
}
