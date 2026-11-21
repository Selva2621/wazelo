"use client";

// Single place GSAP plugins get registered (client only). Import gsap,
// ScrollTrigger and useGSAP from here so registration always happens first.

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

/** Desktop with motion allowed: pins, scrubs and horizontal pans. */
export const MQ_FULL = "(min-width: 1024px) and (prefers-reduced-motion: no-preference)";
/** Any size with motion allowed: entrances and loops. */
export const MQ_MOTION = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, useGSAP };
