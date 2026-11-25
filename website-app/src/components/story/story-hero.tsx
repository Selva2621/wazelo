"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { LiveTime } from "./live-time";
import { ArrowRight } from "lucide-react";
import { APP_REGISTER_URL } from "@/lib/wazelo";
import { gsap, useGSAP, MQ_FULL, MQ_MOTION } from "@/lib/gsap";
import { HERO_STEPS } from "./hero-steps";
import { HeroChat } from "./hero-chat";
import { HeroFilm } from "./hero-film";
import { useStoryPrice } from "./story-media";

/**
 * Full-screen hero film (demo/blender-hero): a team office table with the real Wazelo app on
 * every screen; on the phone a lead is assigned, answered by AI and won. The 3D subjects sit
 * right of centre, so the headline owns the left half.
 */
// Desktop gets the step film (HeroFilm: Cycles-rendered shots of the Blender scene, played like
// the old real-time hero-3d.tsx). Phones get the live chat (HeroChat) instead.
const DESKTOP = "(min-width: 1024px)";

export function StoryHero() {
  const root = useRef<HTMLElement>(null);
  // null until mounted (we can't know the device on the server), then whether the film plays.
  const [film, setFilm] = useState<boolean | null>(null);
  const price = useStoryPrice(); // ₹ (Mumbai) or $ (Dubai) deal value, like the film
  const [readyFilm, setReadyFilm] = useState(false);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0); // bumps on every step change so the chip bar restarts
  const pick = useCallback((i: number) => {
    setStep(i);
    setCycle((c) => c + 1);
  }, []);
  const onReadyFilm = useCallback(() => setReadyFilm(true), []);
  useEffect(() => {
    setFilm(window.matchMedia(DESKTOP).matches);
  }, []);
  // The four beats advance when each step's shot has played out (HeroFilm calls `pick`).

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        gsap
          .timeline({ defaults: { ease: "expo.out", duration: 1.2 } })
          // A fade, not a zoom: scaling the rendered 3D canvas with CSS stretched it and blurred
          // every screen for the first ~2.5 s. The 3D camera's own push-in gives the motion.
          .from("[data-h=film]", { opacity: 0, duration: 1.2, ease: "power2.out" }, 0)
          .from("[data-h=kicker]", { y: 14, autoAlpha: 0, duration: 0.8 }, 0.3)
          .from("[data-h=line]", { yPercent: 105, stagger: 0.12 }, 0.4)
          .from("[data-h=sub]", { y: 18, autoAlpha: 0 }, 0.9)
          .from("[data-h=cta]", { y: 18, autoAlpha: 0, stagger: 0.08 }, 1.0)
          .from("[data-h=chat]", { y: 40, autoAlpha: 0, duration: 1.4 }, 1.1);
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
    <section ref={root} className="tone-fixed relative overflow-hidden bg-ink lg:h-[100svh] lg:min-h-[640px]">
      {/* Desktop only: the step film full-bleed behind the copy.
          Phones get the live chat below the copy instead (HeroChat). */}
      <div data-h="frame" className="absolute inset-0 hidden overflow-hidden will-change-transform lg:block">
        <div
          data-h="film"
          role="img"
          aria-label="A real estate team's desk: Meera asks about a 3-bedroom on WhatsApp, Wazelo's AI replies with the price, follow-ups go out and she accepts the offer."
          className="absolute inset-0"
        >
          {/* The film's first frame, in the server HTML so it shows at first paint. The film
              fades in over it once its first clip plays (no blank hero). */}
          {film !== false && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/media/hero-film/poster.jpg"
              alt=""
              fetchPriority="high"
              className="absolute inset-0 hidden h-full w-full scale-[1.04] object-cover lg:block"
            />
          )}
          {film && (
            <HeroFilm
              step={step}
              onStep={pick}
              onReady={onReadyFilm}
              className={`absolute inset-0 transition-opacity duration-1000 ${readyFilm ? "opacity-100" : "opacity-0"}`}
            />
          )}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink to-transparent lg:hidden" />
        </div>
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden bg-[linear-gradient(90deg,rgba(23,19,15,0.95)_0%,rgba(23,19,15,0.86)_38%,rgba(23,19,15,0.35)_50%,rgba(23,19,15,0)_60%)] lg:block" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ink/80 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-ink/85 to-transparent lg:h-36" />
      </div>

      {/* Phones: a warm glow behind the live chat. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] bg-[radial-gradient(70%_45%_at_50%_62%,rgba(240,180,131,0.16),transparent)] lg:hidden" />

      <div className="pointer-events-none relative mx-auto flex max-w-7xl flex-col px-4 pb-10 pt-28 sm:px-6 lg:h-full lg:flex-row lg:items-center lg:px-8 lg:pb-0 lg:pt-0">
        <div data-h="copy" className="pointer-events-auto max-w-xl">
          <p data-h="kicker" className="text-xs font-medium uppercase tracking-[0.22em] text-[#e9c9a6]">
            Wazelo · The lead follow-up platform
          </p>
          <h1 className="mt-5 font-display text-[clamp(3.4rem,7vw,6.75rem)] leading-[0.9] tracking-[-0.02em] text-paper lg:mt-6">
            <span className="block overflow-hidden pb-[0.06em]">
              <span data-h="line" className="block">
                <LiveTime />.
              </span>
            </span>
            <span className="block overflow-hidden pb-[0.1em]">
              <span data-h="line" className="block italic text-[#f0b483]">A customer is waiting.</span>
            </span>
          </h1>
          <p data-h="sub" className="mt-5 max-w-[38ch] text-[17px] leading-relaxed text-paper/75 lg:mt-7 lg:text-lg">
            Wazelo catches every lead, routes it to the right person on your team, replies in
            seconds with AI and follows up until they buy.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3 lg:mt-9">
            <a
              data-h="cta"
              href={APP_REGISTER_URL}
              className="group inline-flex items-center gap-2 rounded-full bg-paper px-5 py-4 text-sm sm:px-7 font-semibold text-ink transition-colors hover:bg-white active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              Start free trial
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </a>
            <a
              data-h="cta"
              href="#story"
              className="inline-flex items-center rounded-full border border-paper/30 px-5 py-4 text-sm sm:px-7 font-semibold text-paper transition-colors hover:border-paper/60 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-paper"
            >
              How it works
            </a>
          </div>
        </div>
        {/* Phones: Meera's story as a live WhatsApp chat (sharp text, nothing heavy to load). */}
        <div data-h="chat" className="pointer-events-auto mt-14 lg:hidden">
          <HeroChat />
        </div>
      </div>
      {film && readyFilm && (
        <p
          key={`tag-${step}-${cycle}`}
          aria-live="polite"
          className="absolute bottom-[5.25rem] right-28 z-10 hidden rounded-full border border-white/10 bg-[#17130f]/85 px-4 py-2 text-[13px] font-medium text-paper motion-safe:animate-[hero-tag_0.5s_ease-out_both] lg:block"
        >
          {HERO_STEPS[step].tag.replace("{price}", price)}
        </p>
      )}
      {film && readyFilm && (
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
