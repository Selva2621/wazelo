"use client";

// Water backgrounds for the homepage's bold sections: layered waves
// (Freelancers, Final CTA) and spreading ripples (Teams). Each loops with
// GSAP only while on screen, speeds up briefly when the page is scrolled fast,
// and stays still with reduced motion.

import { useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, useGSAP, MQ_MOTION } from "@/lib/gsap";

/** Run a looping timeline only while `root` is visible; scrolling stirs it. */
function useWaterLoop(root: RefObject<Element | null>, build: () => gsap.core.Timeline) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ_MOTION, () => {
        const tl = build().pause();
        let visible = false;
        const io = new IntersectionObserver(([e]) => {
          visible = e.isIntersecting;
          if (visible) tl.play();
          else tl.pause();
        });
        io.observe(root.current!);

        ScrollTrigger.create({
          start: 0,
          end: "max",
          onUpdate: (self) => {
            if (!visible) return;
            gsap.to(tl, { timeScale: 1 + gsap.utils.clamp(0, 4, Math.abs(self.getVelocity()) / 400), duration: 0.25, overwrite: true });
            gsap.to(tl, { timeScale: 1, duration: 1.4, delay: 0.25, ease: "power2.out" });
          },
        });

        return () => io.disconnect();
      });
    },
    { scope: root },
  );
}

/* ─── Waves ──────────────────────────────────────────────────────────────── */

/** A smooth wave across two 1440-wide tiles, so shifting it by 1440 loops
    seamlessly (period must divide 1440 evenly). */
function wave(base: number, amp: number, period: number) {
  let d = `M0 ${base} Q ${period / 4} ${base - amp} ${period / 2} ${base}`;
  for (let x = period; x <= 2880; x += period / 2) d += ` T ${x} ${base}`;
  return d;
}

const LAYERS = [
  { d: wave(150, 30, 720), duration: 22, back: false },
  { d: wave(200, 24, 480), duration: 16, back: true },
  { d: wave(250, 18, 360), duration: 11, back: false },
];

/** Three wave layers, back to front. The middle one flows the other way. */
export function Waves({
  fills,
  opacities,
  foam,
  className = "",
}: {
  fills: [string, string, string];
  opacities: [number, number, number];
  foam?: string;
  className?: string;
}) {
  const root = useRef<SVGSVGElement>(null);

  useWaterLoop(root, () => {
    const tl = gsap.timeline();
    gsap.utils.toArray<SVGGElement>("[data-wave]", root.current).forEach((g, i) => {
      const { duration, back } = LAYERS[i];
      tl.fromTo(g, { x: back ? -1440 : 0 }, { x: back ? 0 : -1440, duration, ease: "none", repeat: -1 }, 0);
    });
    return tl;
  });

  return (
    <svg ref={root} aria-hidden viewBox="0 0 1440 320" preserveAspectRatio="none" className={`pointer-events-none absolute inset-x-0 bottom-0 w-full ${className}`}>
      {LAYERS.map((l, i) => (
        <g key={i} data-wave>
          <path d={`${l.d} V 320 H 0 Z`} fill={fills[i]} opacity={opacities[i]} />
          {foam && i === LAYERS.length - 1 && <path d={l.d} fill="none" stroke={foam} strokeWidth={2} vectorEffect="non-scaling-stroke" />}
        </g>
      ))}
    </svg>
  );
}

/* ─── Ripples ────────────────────────────────────────────────────────────── */

const RINGS = 6;
const RIPPLE_S = 10;
const ORIGINS = [
  { cx: 820, cy: 220, offset: 0 },
  { cx: 140, cy: 860, offset: RIPPLE_S / 2 },
];

/** Rings spreading out from two points, like drops landing on still water. */
export function Ripples({ stroke, className = "" }: { stroke: string; className?: string }) {
  const root = useRef<SVGSVGElement>(null);

  useWaterLoop(root, () => {
    const tl = gsap.timeline();
    gsap.utils.toArray<SVGGElement>("[data-origin]", root.current).forEach((g, i) => {
      tl.fromTo(
        g.querySelectorAll("circle"),
        { attr: { r: 20 }, opacity: 0.8 },
        { attr: { r: 720 }, opacity: 0, duration: RIPPLE_S, ease: "sine.out", stagger: { each: RIPPLE_S / RINGS, repeat: -1 } },
        ORIGINS[i].offset,
      );
    });
    // Start mid-cycle so the rings are already spread out, not bunched.
    return tl.time(RIPPLE_S * 1.5);
  });

  return (
    <svg ref={root} aria-hidden viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}>
      {ORIGINS.map((o) => (
        <g key={`${o.cx}-${o.cy}`} data-origin>
          {Array.from({ length: RINGS }, (_, i) => (
            // Static rings for reduced motion; GSAP takes over otherwise.
            <circle key={i} cx={o.cx} cy={o.cy} r={110 * (i + 1)} fill="none" stroke={stroke} strokeWidth={1.5} vectorEffect="non-scaling-stroke" opacity={0.5 - i * 0.07} />
          ))}
        </g>
      ))}
    </svg>
  );
}

/* ─── Card ───────────────────────────────────────────────────────────────── */

/** Big rounded card behind a section. Colours come from the `--wave-*`
    tokens in theme.css; `tone="teal"` swaps them for the teal set. */
export function WaterCard({
  tone = "amber",
  variant = "waves",
  className = "",
  waveClassName = "h-48 lg:h-[38%]",
}: {
  tone?: "amber" | "teal";
  variant?: "waves" | "ripples";
  className?: string;
  waveClassName?: string;
}) {
  return (
    <div
      aria-hidden
      data-tone={tone}
      className={`pointer-events-none absolute overflow-hidden ring-1 ring-[var(--wave-card-ring)] ${className}`}
      style={{ background: "linear-gradient(180deg, var(--wave-card-top), var(--wave-card-mid) 65%)" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(40rem_24rem_at_12%_0%,var(--wave-foam),transparent_70%)]" />
      {variant === "waves" ? (
        <Waves fills={["var(--wave-1)", "var(--wave-2)", "var(--wave-3)"]} opacities={[0.9, 0.5, 0.6]} foam="var(--wave-foam)" className={waveClassName} />
      ) : (
        <Ripples stroke="var(--wave-3)" />
      )}
    </div>
  );
}
