"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Lenis from "@studio-freight/lenis";

// ── Context ────────────────────────────────────────────────────────────────────
export const LenisContext = createContext<React.RefObject<Lenis | null>>({ current: null });
export function useLenis() { return useContext(LenisContext).current; }

// ── Provider ───────────────────────────────────────────────────────────────────
export default function LenisProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lenisRef = useRef<Lenis | null>(null);
  const rafIdRef = useRef<number>(0);

  // Create Lenis once on mount, destroy on unmount
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.history.scrollRestoration = "manual";

    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true, syncTouch: false });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      rafIdRef.current = requestAnimationFrame(raf);
    }
    rafIdRef.current = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafIdRef.current);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  // On route change: reset to top, then honour hash if present
  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;

    const hash = window.location.hash;
    lenis.scrollTo(0, { immediate: true });

    if (hash) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const target = document.querySelector(hash);
          if (target) {
            lenis.scrollTo(target as HTMLElement, { offset: -72 });
          }
        });
      });
    }
  }, [pathname]);

  return (
    <LenisContext.Provider value={lenisRef}>
      {children}
    </LenisContext.Provider>
  );
}
