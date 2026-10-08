"use client";

// Fixed glass circle on the right edge: an amber ring fills with page scroll,
// the centre arrow points down (jump to bottom) until halfway, then flips up
// (jump to top). The percentage shows beside it while scrolling and on hover.

import { useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDown, ArrowUp } from "lucide-react";
import { LenisContext } from "@/app/lenis-provider";
import { springs } from "@/components/mocks/motion";

const R = 21;

export function ScrollMeter() {
  const lenis = useContext(LenisContext);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const ring = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });
  const glow = useTransform(ring, [0, 1], [0.2, 1]);

  const [pct, setPct] = useState(0);
  const [scrolling, setScrolling] = useState(false);
  const [hovered, setHovered] = useState(false);
  const idle = useRef<ReturnType<typeof setTimeout>>(undefined);

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    setPct(Math.round(v * 100));
    setScrolling(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setScrolling(false), 1200);
  });
  useEffect(() => () => clearTimeout(idle.current), []);

  const up = pct >= 50;
  const visible = pct > 1;

  const jump = () => {
    const y = up ? 0 : document.documentElement.scrollHeight;
    if (lenis.current) lenis.current.scrollTo(y, { duration: 1.4, immediate: !!reduce });
    else window.scrollTo({ top: y, behavior: reduce ? "auto" : "smooth" });
  };

  const label = `${up ? "Scroll to top" : "Scroll to bottom"}, ${pct}% scrolled`;
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="scroll-meter"
          initial={reduce ? false : { opacity: 0, scale: 0.8, x: 16 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.8, x: 16 }}
          transition={springs.gentle}
          className="fixed bottom-6 right-4 z-40 flex items-center gap-2 sm:right-6"
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <AnimatePresence>
            {(scrolling || hovered) && (
              <motion.span
                key="pct"
                aria-hidden
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={springs.snappy}
                className="lg-glass-pill rounded-full px-2.5 py-1 font-mono text-xs tabular-nums text-on-surface"
              >
                {pct}%
              </motion.span>
            )}
          </AnimatePresence>

          <div className="relative">
            {/* Breathing glow: brightens as the ring fills, and slowly breathes. */}
            <motion.span aria-hidden style={{ opacity: glow }} className="pointer-events-none absolute -inset-3 -z-10 block">
              <motion.span
                animate={reduce ? undefined : { scale: [1, 1.18, 1] }}
                transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
                className="block size-full rounded-full bg-[radial-gradient(closest-side,rgb(var(--fx-accent)/0.55),transparent)] blur-md"
              />
            </motion.span>
            <motion.button
              type="button"
              onClick={jump}
              onFocus={() => setHovered(true)}
              onBlur={() => setHovered(false)}
              aria-label={label}
              title={label}
              whileHover={reduce ? undefined : { scale: 1.06 }}
              whileTap={reduce ? undefined : { scale: 0.94 }}
              transition={springs.snappy}
              className="lg-glass relative grid size-12 place-items-center rounded-full text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container"
            >
              <svg aria-hidden viewBox="0 0 48 48" className="absolute inset-0 size-full -rotate-90">
                <circle cx="24" cy="24" r={R} fill="none" strokeWidth="2.5" className="stroke-ink/10" />
                <motion.circle
                  cx="24"
                  cy="24"
                  r={R}
                  fill="none"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  className="stroke-primary-container"
                  style={{ pathLength: reduce ? scrollYProgress : ring }}
                />
              </svg>
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={up ? "up" : "down"}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, y: up ? 8 : -8, rotate: up ? -90 : 90 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: up ? -8 : 8 }}
                  transition={springs.snappy}
                  className="relative"
                >
                  {up ? <ArrowUp className="h-[18px] w-[18px]" /> : <ArrowDown className="h-[18px] w-[18px]" />}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
