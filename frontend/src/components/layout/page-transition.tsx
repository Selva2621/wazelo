"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { motionTokens } from "@/lib/motion-tokens";

/**
 * Route-level entrance for the app shell: each page mounts immediately and fades up while
 * its top-level sections cascade (see `.page-stagger` in globals.css).
 *
 * Deliberately enter-only. An exit phase (`AnimatePresence mode="wait"`) has to hold the
 * next page back until the old one finishes animating, and with quick module-to-module
 * clicks that queue could stall and leave the content area blank. Overlays (Modal, Drawer,
 * menus) still animate both in and out.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();

  if (reduceMotion) return <>{children}</>;

  return (
    <motion.div
      // New key per route: the page remounts and plays its entrance
      key={pathname}
      // h-full keeps full-height pages (inbox) sized to <main>; it is a no-op elsewhere.
      className="page-stagger h-full"
      initial={{ opacity: 0, y: motionTokens.distance.md }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: motionTokens.duration.slow, ease: motionTokens.easing.standard },
      }}
    >
      {children}
    </motion.div>
  );
}
