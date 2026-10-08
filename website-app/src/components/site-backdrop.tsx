"use client";

// Fixed page backdrop: a quiet line grid with an amber spotlight that trails
// the cursor and lights up the grid lines under it. Position lives in --mx/--my
// on the root element, eased in a rAF loop that only runs while catching up.
// Touch devices and reduced-motion users get a static spotlight.

import { useEffect, useRef } from "react";

export function SiteBackdrop() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const pos = { x: window.innerWidth * 0.7, y: window.innerHeight * 0.2 };
    const target = { ...pos };
    let frame = 0;

    const paint = () => {
      el.style.setProperty("--mx", `${pos.x}px`);
      el.style.setProperty("--my", `${pos.y}px`);
    };

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.12;
      pos.y += (target.y - pos.y) * 0.12;
      paint();
      frame = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.5 ? requestAnimationFrame(tick) : 0;
    };

    const onMove = (e: PointerEvent) => {
      target.x = e.clientX;
      target.y = e.clientY;
      if (reduce) {
        pos.x = target.x;
        pos.y = target.y;
        paint();
      } else if (!frame) {
        frame = requestAnimationFrame(tick);
      }
    };

    paint();
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={root} aria-hidden className="site-backdrop">
      <span className="site-grid" />
      <span className="site-grid site-grid--lit" />
      <span className="site-spot" />
    </div>
  );
}
