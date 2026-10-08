"use client";

// Closing call to action: one bold amber panel, type only (no images).
// The highlighted word rotates through what arrives on WhatsApp.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useInView, useMotionValue, useReducedMotion, useSpring } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Reveal } from "@/components/home/reveal";
import { APP_REGISTER_URL } from "@/lib/wazelo";

const WORDS = ["client", "order", "booking", "review"];
const ROTATE_MS = 2200;
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-on-primary";

/** Rotating word; pauses off screen and stays still with reduced motion. */
function RotatingWord() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { amount: 0.6 });
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce || !inView) return;
    const t = setInterval(() => setI((n) => (n + 1) % WORDS.length), ROTATE_MS);
    return () => clearInterval(t);
  }, [reduce, inView]);

  return (
    <>
    <span className="sr-only">client</span>
    <span ref={ref} aria-hidden className="relative inline-grid overflow-hidden pb-[0.08em] align-bottom">
      {/* widest word reserves the space so the line never jumps */}
      <span aria-hidden className="invisible col-start-1 row-start-1">booking</span>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={WORDS[i]}
          className="col-start-1 row-start-1 underline decoration-on-primary/40 decoration-[0.06em] underline-offset-[0.14em]"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: "0%", opacity: 1 }}
          exit={{ y: "-100%", opacity: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          {WORDS[i]}
        </motion.span>
      </AnimatePresence>
    </span>
    </>
  );
}

/** Button that leans toward the cursor. Motion values only, no re-renders. */
function MagneticLink({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const x = useSpring(mx, { stiffness: 150, damping: 15, mass: 0.4 });
  const y = useSpring(my, { stiffness: 150, damping: 15, mass: 0.4 });

  return (
    <motion.a
      ref={ref}
      href={href}
      style={{ x, y }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse" || !ref.current) return;
        const r = ref.current.getBoundingClientRect();
        mx.set((e.clientX - (r.left + r.width / 2)) * 0.25);
        my.set((e.clientY - (r.top + r.height / 2)) * 0.35);
      }}
      onPointerLeave={() => {
        mx.set(0);
        my.set(0);
      }}
      className={className}
    >
      {children}
    </motion.a>
  );
}

export function FinalCta() {
  return (
    <section className="px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
      <Reveal className="mx-auto max-w-7xl">
        <div className="relative isolate overflow-hidden rounded-[2.5rem] bg-primary-container px-6 py-16 text-on-primary shadow-[0_40px_80px_-40px_rgb(var(--fx-accent)/0.6)] sm:px-12 lg:px-20 lg:py-24">
          {/* faint grid + light, drawn in CSS */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 opacity-[0.14] [background-image:linear-gradient(to_right,currentColor_1px,transparent_1px),linear-gradient(to_bottom,currentColor_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(ellipse_80%_70%_at_70%_20%,#000_20%,transparent_75%)]"
          />
          <div aria-hidden className="absolute -right-24 -top-24 -z-10 size-[28rem] rounded-full bg-on-primary/10 blur-3xl" />

          <div className="grid items-end gap-12 lg:grid-cols-12">
            <h2 className="text-4xl font-semibold leading-[1.05] tracking-tighter sm:text-5xl md:text-6xl lg:col-span-8">
              Your next <RotatingWord /> is already on WhatsApp.
            </h2>

            <div className="lg:col-span-4">
              <p className="max-w-[36ch] text-lg leading-relaxed opacity-85">Scan a QR code to connect your WhatsApp. Try Wazelo free for 14 days.</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <MagneticLink
                  href={APP_REGISTER_URL}
                  className={`group inline-flex items-center gap-2 rounded-full bg-on-primary px-7 py-4 text-sm font-semibold text-primary-container transition-transform active:scale-[0.98] ${focusRing}`}
                >
                  Start free trial
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </MagneticLink>
                <Link
                  href="/contact"
                  className={`inline-flex items-center rounded-full border border-on-primary/40 px-7 py-4 text-sm font-semibold transition-colors hover:bg-on-primary/10 active:scale-[0.98] ${focusRing}`}
                >
                  Talk to sales
                </Link>
              </div>
            </div>
          </div>

          <ul className="mt-14 flex flex-wrap gap-x-8 gap-y-3 border-t border-on-primary/20 pt-8 text-sm">
            {["14-day free trial", "No card needed", "Cancel any time"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="grid size-5 place-items-center rounded-full bg-on-primary/15">
                  <Check className="h-3 w-3" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
