"use client";

// Laptop mock-up. The screen renders a fixed 960x600 app canvas and scales it to
// the available width. The scale is a motion value on a motion element, so
// framer-motion's layout animations inside the screen account for it.

import { useEffect, useRef, type ReactNode } from "react";
import { motion, useMotionValue } from "framer-motion";

export const SCREEN_W = 960;
export const SCREEN_H = 600;

export function LaptopFrame({ children, className }: { children: ReactNode; className?: string }) {
  const screenRef = useRef<HTMLDivElement>(null);
  const scale = useMotionValue(0.6);

  useEffect(() => {
    const el = screenRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => scale.set(entry.contentRect.width / SCREEN_W));
    ro.observe(el);
    return () => ro.disconnect();
  }, [scale]);

  return (
    <div className={`relative w-full [perspective:1600px] ${className ?? ""}`} inert aria-hidden>
      {/* lid: data-laptop-lid lets a parent section rotate it open from the hinge */}
      <div data-laptop-lid className="relative mx-auto w-[88%] origin-bottom rounded-t-[1.1rem] [backface-visibility:hidden] bg-[#111318] px-[1.4%] pb-[1.4%] pt-[2.2%] shadow-modal ring-1 ring-white/10">
        <span className="absolute left-1/2 top-[0.9%] size-1.5 -translate-x-1/2 rounded-full bg-white/15" />
        <div ref={screenRef} className="relative aspect-[8/5] w-full overflow-hidden rounded-[3px] bg-surface">
          <motion.div
            className="absolute left-0 top-0"
            style={{ width: SCREEN_W, height: SCREEN_H, scale, originX: 0, originY: 0 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
      {/* base */}
      <div className="laptop-base relative h-3 w-full rounded-b-[0.9rem] sm:h-4">
        <span className="absolute left-1/2 top-0 h-1.5 w-[14%] -translate-x-1/2 rounded-b-md bg-black/40" />
      </div>
    </div>
  );
}
