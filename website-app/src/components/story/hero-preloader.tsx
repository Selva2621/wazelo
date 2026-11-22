"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Desktop-only loading screen while the 3D hero loads: the Wazelo mark and wordmark, and a 0-100
 * counter that follows the real loading. It only signals "loading" and gets out of the way the
 * moment the scene is ready: no holds, no intro of its own.
 *
 * It is in the server HTML (desktop widths only, via CSS) so it is the very first paint; the
 * `preloader-init` head script in app/layout.tsx hides it before that paint when it should not
 * show. Stays at least MIN_MS (no flash on a fast load) and at most MAX_MS (a slow GPU or
 * network never holds the page hostage).
 */
const MIN_MS = 400;
const MAX_MS = 3500;
const FINISH_MS = 250; // counter run from wherever it is to 100
const FADE_MS = 300;
// One period of the fill's wave surface (tiled across, slid sideways by `pl-wave`).
const WAVE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="18"><path d="M0 9 Q40 0 80 9 T160 9 V18 H0Z"/></svg>`);

export function HeroPreloader({
  done,
  progress,
  onReveal,
  onHidden,
}: {
  /** The 3D scene's first frame is on screen. */
  done: boolean;
  /** Scene asset progress 0-100, or -1 while the 3D module itself is still downloading. */
  progress: React.RefObject<number>;
  /** The fade starts: the hero's own intro can begin underneath. */
  onReveal: () => void;
  onHidden: () => void;
}) {
  const [minPassed, setMinPassed] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [count, setCount] = useState(0);
  const finishing = (done && minPassed) || timedOut;
  const finishingRef = useRef(finishing);
  useEffect(() => {
    finishingRef.current = finishing;
  }, [finishing]);

  useEffect(() => {
    const min = window.setTimeout(() => setMinPassed(true), MIN_MS);
    const max = window.setTimeout(() => setTimedOut(true), MAX_MS);
    return () => {
      window.clearTimeout(min);
      window.clearTimeout(max);
    };
  }, []);

  // Counter follows real loading: 0-30 while the 3D module (three.js) downloads (no progress
  // events, so it eases toward 30), 30-95 with the scene's asset progress, then a quick run to 100
  // once the first frame is up. It glides and never goes backwards.
  useEffect(() => {
    const start = performance.now();
    let last = start;
    let shown = 0;
    let raf = 0;
    const tick = (now: number) => {
      // rAF timestamps can be a little before `start` (clamp at 0); capped so a main-thread stall
      // (three.js start-up) is followed by a glide, not a jump.
      const dt = Math.min(0.05, Math.max(0, now - last) / 1000);
      last = Math.max(last, now);
      const elapsed = Math.max(0, now - start);
      const p = progress.current ?? -1;
      let target: number;
      if (finishingRef.current) target = 100;
      else if (p < 0) target = 30 * (1 - Math.pow(1 - Math.min(1, elapsed / 2500), 3));
      else target = 30 + 0.65 * Math.min(100, p);
      let step = (target - shown) * Math.min(1, dt * 4);
      if (target === 100) step = Math.max(step, (100 / FINISH_MS) * 1000 * dt);
      shown = Math.max(0, Math.min(100, Math.max(shown, Math.min(target, shown + step))));
      setCount(Math.floor(shown));
      if (shown < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [progress]);

  // At 100: fade out at once and hand over to the hero.
  const leaving = count >= 100;
  useEffect(() => {
    if (!leaving) return;
    onReveal();
    const id = window.setTimeout(onHidden, FADE_MS);
    return () => window.clearTimeout(id);
  }, [leaving, onReveal, onHidden]); // the callbacks are stable (useCallback in story-hero)

  return (
    <div
      role="status"
      aria-label="Loading Wazelo"
      className="hero-preloader fixed inset-0 z-[100] hidden flex-col items-center justify-center bg-white text-[#17130f] transition-opacity ease-out lg:flex"
      style={{ opacity: leaving ? 0 : 1, transitionDuration: `${FADE_MS}ms` }}
    >
      {/* The Wazelo mark (public/logo/wazelo-mark.svg), inline so there's nothing to download.
          It opens from the centre (CSS keyframes, so it plays from the first paint, before JS). */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        className="size-24 [animation:pl-wings_550ms_cubic-bezier(0.25,1,0.5,1)_both]"
      >
        <defs>
          <filter id="pl-soft" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3b1d03" floodOpacity="0.35" />
          </filter>
          <linearGradient id="pl-back" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c3a06" />
            <stop offset="1" stopColor="#4a2203" />
          </linearGradient>
          <linearGradient id="pl-mid" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#c2650a" />
            <stop offset="1" stopColor="#8a4207" />
          </linearGradient>
          <linearGradient id="pl-front" x1="0" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#fcd34d" />
            <stop offset="0.45" stopColor="#f59e0b" />
            <stop offset="1" stopColor="#d97706" />
          </linearGradient>
        </defs>
        <path fill="url(#pl-back)" d="M44 6h34a16 16 0 0 1 16 16v20a16 16 0 0 1-16 16h-2v10l-12-10H44a16 16 0 0 1-16-16V22A16 16 0 0 1 44 6z" />
        <path fill="url(#pl-mid)" filter="url(#pl-soft)" d="M34 18h34a16 16 0 0 1 16 16v20a16 16 0 0 1-16 16H34a16 16 0 0 1-16-16V34a16 16 0 0 1 16-16z" />
        <g filter="url(#pl-soft)">
          <path fill="url(#pl-front)" d="M22 32h40a16 16 0 0 1 16 16v22a16 16 0 0 1-16 16H30L14 96V84.6A16 16 0 0 1 6 70V48a16 16 0 0 1 16-16z" />
          <path fill="#fff" opacity="0.28" d="M22 34h40a14 14 0 0 1 14 14v1H8v-1a14 14 0 0 1 14-14z" />
          <path fill="none" stroke="#3b1d03" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" d="M20 50l6 20 6-14 6 14 6-20M50 50h12l-7 20h12" />
        </g>
      </svg>
      {/* The wordmark is the progress bar: a faint outline that fills with the brand colours from
          the bottom, a wave on its surface, as the real loading climbs. */}
      <p aria-hidden className="relative mt-2 text-[clamp(6rem,16vw,15rem)] font-semibold leading-[1.05] tracking-[-0.045em]">
        <span className="text-[#17130f]/[0.07]">Wazelo</span>
        <span
          className="absolute inset-x-0 bottom-0 overflow-hidden"
          style={{
            height: `${count}%`,
            ...(count < 100 && {
              maskImage: `url("${WAVE}"), linear-gradient(#000, #000)`,
              maskSize: "160px 18px, 100% calc(100% - 17px)",
              maskRepeat: "repeat-x, no-repeat",
              maskPosition: "0 0, 0 100%",
              animation: "pl-wave 1.4s linear infinite",
            }),
          }}
        >
          <span className="absolute bottom-0 left-0 whitespace-nowrap">
            Waze<span className="text-[#c2410c]">lo</span>
          </span>
        </span>
      </p>
      <p
        aria-hidden
        className="absolute bottom-6 right-12 font-display text-[clamp(4rem,7vw,6.5rem)] leading-none tracking-[-0.03em] tabular-nums"
      >
        {count}
      </p>
    </div>
  );
}
