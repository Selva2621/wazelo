"use client";

import { Gloock } from "next/font/google";
import { useEffect, useId, useRef, useState } from "react";

// Self-hosted by next/font; only this component uses it.
const gloock = Gloock({ subsets: ["latin"], weight: "400", display: "swap" });

// Big closing "Wazelo" set in Gloock with a sparkle after it, coloured like the navbar logo:
// "Waze" in cream, "lo" and the sparkle in rust. It sits dim, like a stage with the lights
// down; on hover a spotlight follows the pointer and lights the colours up. Touch screens
// can't hover, so there it is simply lit. The bottom is cropped and faded, and it sweeps in
// left to right the first time it scrolls into view. Decorative only: hidden from assistive tech.
type State = "static" | "hidden" | "shown";

const W = 1000;
const H = 220;
const SPOT_R = 300;
const CREAM = "#f3eee6"; // --color-paper in the always-dark footer
const RUST = "#e8773f"; // --color-rust as the site uses it on dark backgrounds

// Four-point sparkle centred on (cx, cy): long vertical and horizontal points, pinched waist.
function sparklePath(cx: number, cy: number, r: number) {
  const k = r * 0.16;
  return `M${cx} ${cy - r} C${cx + k} ${cy - k} ${cx + k} ${cy - k} ${cx + r} ${cy} C${cx + k} ${cy + k} ${cx + k} ${cy + k} ${cx} ${cy + r} C${cx - k} ${cy + k} ${cx - k} ${cy + k} ${cx - r} ${cy} C${cx - k} ${cy - k} ${cx - k} ${cy - k} ${cx} ${cy - r}Z`;
}

function Word({ lit }: { lit: boolean }) {
  // The dim copy is one flat faint colour; the lit copy carries the logo colours.
  const waze = lit ? CREAM : "currentColor";
  const lo = lit ? RUST : "currentColor";
  return (
    <g opacity={lit ? 1 : 0.1}>
      <text
        x="4"
        y="206"
        textLength="900"
        lengthAdjust="spacingAndGlyphs"
        fontSize="250"
        style={{ fontFamily: gloock.style.fontFamily }}
      >
        <tspan fill={waze}>Waze</tspan>
        <tspan fill={lo}>lo</tspan>
      </text>
      <path d={sparklePath(956, 118, 40)} fill={lo} />
    </g>
  );
}

export default function FooterWordmark() {
  const ref = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const spotRef = useRef<SVGCircleElement>(null);
  // "static" on the server and without JS: plain and visible, no animation.
  const [state, setState] = useState<State>("static");
  // Until we know the device can hover, keep the word fully lit (touch, no-JS).
  const [canHover, setCanHover] = useState(false);
  const id = useId().replace(/:/g, "");

  // Scroll-in reveal.
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return; // already on screen: leave it
    setState("hidden");
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setCanHover(mq.matches);
    const onChange = () => setCanHover(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Spotlight: eases toward the pointer each frame so it glides instead of snapping.
  useEffect(() => {
    const el = ref.current;
    const svg = svgRef.current;
    const spot = spotRef.current;
    if (!canHover || !el || !svg || !spot) return;
    const instant = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { x: W / 2, y: H / 2 };
    const pos = { ...target };
    let frame = 0;

    const tick = () => {
      pos.x += (target.x - pos.x) * (instant ? 1 : 0.16);
      pos.y += (target.y - pos.y) * (instant ? 1 : 0.16);
      spot.setAttribute("cx", pos.x.toFixed(1));
      spot.setAttribute("cy", pos.y.toFixed(1));
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };
    const move = (e: PointerEvent) => {
      const r = svg.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * W;
      target.y = ((e.clientY - r.top) / r.height) * H;
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const enter = (e: PointerEvent) => {
      move(e);
      // Start the light where the pointer came in, not where it last left.
      pos.x = target.x;
      pos.y = target.y;
      spot.style.opacity = "1";
    };
    const leave = () => {
      spot.style.opacity = "0";
    };

    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [canHover]);

  const hidden = state === "hidden";
  const ease = "1.5s cubic-bezier(0.22, 1, 0.36, 1)";

  return (
    <div
      ref={ref}
      aria-hidden="true"
      // Crop the lower part of the letters and fade them out, like a sign sinking below the edge.
      // Phones crop less: the word is already small there, so more of it stays readable.
      className="mt-6 aspect-[1000/210] select-none overflow-hidden sm:aspect-[1000/200] lg:mt-8 lg:aspect-[1000/195]"
      style={{
        maskImage: "linear-gradient(to bottom, #000 65%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, #000 65%, transparent 100%)",
      }}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full text-paper"
        style={{
          clipPath: hidden ? "inset(0 100% 0 0)" : "inset(0 0 0 0)",
          transform: hidden ? "translateY(14%)" : "translateY(0)",
          transition: state === "shown" ? `clip-path ${ease}, transform ${ease}` : "none",
        }}
      >
        <defs>
          {/* Soft-edged spotlight: full light in the middle, falling off to nothing. */}
          <radialGradient id={`${id}-beam`}>
            <stop offset="0" stopColor="#fff" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="0.85" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id={`${id}-spot`} maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
            <circle
              ref={spotRef}
              cx={W / 2}
              cy={H / 2}
              r={SPOT_R}
              fill={`url(#${id}-beam)`}
              style={{ opacity: 0, transition: "opacity 0.45s ease" }}
            />
          </mask>
        </defs>
        {/* Lights down: the word is just there, a faint shape on the ink. */}
        {canHover && <Word lit={false} />}
        {/* Lit: logo colours, shown only inside the spotlight on hover devices. */}
        <g mask={canHover ? `url(#${id}-spot)` : undefined}>
          <Word lit />
        </g>
      </svg>
    </div>
  );
}
