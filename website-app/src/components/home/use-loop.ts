"use client";

import { useRef } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { usePageVisible } from "@/components/mocks/phone-frame";

/**
 * Gate for looping demos: true only while the element is on screen, the tab is
 * visible and the user has not asked for reduced motion.
 */
export function useLoopActive<T extends Element = HTMLDivElement>(amount = 0.4) {
  const ref = useRef<T>(null);
  const inView = useInView(ref, { amount });
  const visible = usePageVisible();
  const reduce = !!useReducedMotion();
  return { ref, active: inView && visible && !reduce, reduce };
}
