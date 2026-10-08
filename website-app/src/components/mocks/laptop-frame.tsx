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
      {/* lid: data-laptop-lid lets a parent section rotate it open from the hinge.
          The anodised shell shows as a thin edge around the black glass bezel. */}
      <div data-laptop-lid className="laptop-shell relative mx-auto w-[88%] origin-bottom rounded-t-[1.15rem] p-[0.35%] [backface-visibility:hidden]">
        <div className="relative rounded-t-[1rem] bg-black px-[1.3%] pb-[1.6%] pt-[2.4%]">
          {/* camera */}
          <span className="laptop-camera absolute left-1/2 top-[0.75%] size-[0.45rem] -translate-x-1/2 rounded-full" />
          <div ref={screenRef} className="relative aspect-[8/5] w-full overflow-hidden rounded-[3px] bg-surface">
            <motion.div
              className="absolute left-0 top-0"
              style={{ width: SCREEN_W, height: SCREEN_H, scale, originX: 0, originY: 0 }}
            >
              {children}
            </motion.div>
            <span className="laptop-glare pointer-events-none absolute inset-0" />
          </div>
        </div>
      </div>
      {/* hinge */}
      <div className="laptop-hinge mx-auto h-[5px] w-[76%] rounded-b-[3px]" />
      {/* base: tapered deck with a thumb cut-out, rubber feet and a floor shadow */}
      <div className="relative">
        <span className="laptop-floor pointer-events-none absolute inset-x-[3%] -bottom-5 -z-10 h-8 rounded-full" />
        <div className="laptop-base relative h-3 w-full sm:h-4">
          <span className="laptop-thumb absolute left-1/2 top-0 h-[45%] w-[13%] -translate-x-1/2 rounded-b-[0.6rem]" />
        </div>
        <span className="absolute -bottom-[2px] left-[10%] h-[2px] w-[7%] rounded-b-full bg-black/70" />
        <span className="absolute -bottom-[2px] right-[10%] h-[2px] w-[7%] rounded-b-full bg-black/70" />
      </div>
    </div>
  );
}
