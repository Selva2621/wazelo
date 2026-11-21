"use client";

import { useEffect } from "react";
import { usePlatform } from "@/lib/platform";

const TARGETS =
  'button:not(:disabled), a[href], [role="button"], [role="tab"], [role="option"], [role="menuitem"], [role="radio"], summary, label[for]';

/**
 * Material ink ripple for Android (phones and tablets; mounted by AppShell).
 * Draws the ripple in a fixed overlay clipped to the pressed element's box, so no
 * element's own position/overflow styles are changed. Nothing renders on iOS.
 */
export function TouchRipple() {
  const android = usePlatform() === "android";

  useEffect(() => {
    if (!android) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      const el = (e.target as Element | null)?.closest<HTMLElement>(TARGETS);
      if (!el || el.closest("[data-no-ripple], .react-flow")) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0 || rect.width * rect.height > 400 * 400) return;

      const style = getComputedStyle(el);
      const clip = document.createElement("span");
      clip.className = "m3-ripple-clip";
      clip.style.cssText = `left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;border-radius:${style.borderRadius};color:${style.color}`;

      const size = Math.hypot(rect.width, rect.height) * 2;
      const ink = document.createElement("span");
      ink.className = "m3-ripple-ink";
      ink.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
      clip.appendChild(ink);
      document.body.appendChild(clip);

      // Fade out once the finger lifts (and the grow animation has had time to show)
      const started = performance.now();
      const release = () => {
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
        const wait = Math.max(0, 220 - (performance.now() - started));
        window.setTimeout(() => {
          clip.classList.add("m3-ripple-out");
          window.setTimeout(() => clip.remove(), 260);
        }, wait);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

    window.addEventListener("pointerdown", onDown, { passive: true });
    return () => window.removeEventListener("pointerdown", onDown);
  }, [android]);

  return null;
}
