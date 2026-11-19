"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { haptic } from "@/lib/haptics";
import { usePlatform } from "@/lib/platform";
import { isTabRoot, parentRoute } from "@/lib/mobile-routes";
import { useMobileStore } from "@/stores/mobile-store";
import { usePwaStore } from "@/stores/pwa-store";

const EDGE = 24;
const TRIGGER = 90;

/** Screens that handle Back themselves (e.g. an open chat) cancel this event. */
export const MOBILE_BACK_EVENT = "mobile:back";

/**
 * Swipe from the left edge to go back, like iOS. Only in the installed app: Safari
 * already has its own back swipe. A screen can take over Back by listening for
 * MOBILE_BACK_EVENT and calling preventDefault().
 */
export function EdgeSwipeBack() {
  const router = useRouter();
  const pathname = usePathname();
  const installed = usePwaStore((s) => s.standalone);
  // Android has its own system back gesture; this one is iOS only
  const platform = usePlatform();
  const standalone = installed && platform === "ios";
  const history = useMobileStore((s) => s.history);
  const [dx, setDx] = useState(0);
  const start = useRef<{ x: number; y: number } | null>(null);
  const dxRef = useRef(0);

  useEffect(() => {
    if (!standalone) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      const target = e.target as Element;
      start.current =
        e.touches.length === 1 && t.clientX <= EDGE && !target.closest(".react-flow, [data-no-edge-swipe]")
          ? { x: t.clientX, y: t.clientY }
          : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const t = e.touches[0];
      const moveX = t.clientX - start.current.x;
      const moveY = Math.abs(t.clientY - start.current.y);
      if (moveY > moveX && moveY > 12) {
        start.current = null;
        setDx((dxRef.current = 0));
        return;
      }
      const next = Math.max(0, moveX);
      if (dxRef.current < TRIGGER && next >= TRIGGER) haptic();
      dxRef.current = next;
      setDx(next);
    };
    const onEnd = () => {
      if (!start.current) return;
      start.current = null;
      const reached = dxRef.current >= TRIGGER;
      setDx((dxRef.current = 0));
      if (!reached) return;

      const event = new CustomEvent(MOBILE_BACK_EVENT, { cancelable: true });
      if (!window.dispatchEvent(event)) return; // a screen handled it
      if (isTabRoot(pathname)) return;
      if (history.length > 1) router.back();
      else router.push(parentRoute(pathname).href);
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    window.addEventListener("touchcancel", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [standalone, pathname, history, router]);

  if (dx === 0) return null;
  const progress = Math.min(1, dx / TRIGGER);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed left-0 top-1/2 z-[90] lg:hidden"
      style={{ transform: `translate(${Math.min(dx, TRIGGER + 20) - 44}px, -50%)` }}
    >
      <span
        className="grid size-11 place-items-center rounded-full bg-surface-container-lowest text-primary shadow-lg"
        style={{ opacity: 0.4 + progress * 0.6 }}
      >
        <ChevronLeft className="h-6 w-6" strokeWidth={2.4} />
      </span>
    </div>
  );
}
