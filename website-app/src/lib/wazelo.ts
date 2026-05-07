"use client";

import { useRef, useState, useEffect } from "react";

// ─── App URLs ─────────────────────────────────────────────────────────────────
export const APP_REGISTER_URL = "https://app.wazelo.in/auth/register";
export const APP_LOGIN_URL    = "https://app.wazelo.in/auth/login";

// ─── useInView ────────────────────────────────────────────────────────────────
export function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── useCounter ───────────────────────────────────────────────────────────────
export function useCounter(target: number, duration = 1800, active = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let current = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [active, target, duration]);
  return count;
}

// ─── useBreakpoint ────────────────────────────────────────────────────────────
export function useBreakpoint() {
  const [bp, setBp] = useState({ mobile: false, tablet: false });
  useEffect(() => {
    const update = () => setBp({
      mobile: window.innerWidth < 768,
      tablet: window.innerWidth < 992,
    });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return bp;
}
