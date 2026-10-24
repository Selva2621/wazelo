"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { haptic } from "@/lib/haptics";

const TRIGGER = 72;
const MAX_PULL = 110;

/** Nearest ancestor (or the element itself) that scrolls vertically and is not at the top. */
function scrolledAncestor(el: Element | null): boolean {
  for (let node = el; node && node !== document.body; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (/(auto|scroll)/.test(style.overflowY) && node.scrollHeight > node.clientHeight && node.scrollTop > 0) {
      return true;
    }
  }
  return false;
}

/**
 * iOS pull-to-refresh for the app (phones and tablets; mounted by AppShell).
 * Pull down from the top of a page to refetch its data. Pulls that start inside a
 * scrolled list, a dialog/sheet, or an editor canvas are left alone.
 */
export function PullToRefresh() {
  const queryClient = useQueryClient();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const start = useRef<{ y: number; x: number } | null>(null);
  const pullRef = useRef(0);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      const target = e.target as Element;
      if (
        refreshing ||
        window.scrollY > 0 ||
        e.touches.length !== 1 ||
        target.closest('[role="dialog"], .react-flow, [data-no-pull], input, textarea, select') ||
        scrolledAncestor(target)
      ) {
        start.current = null;
        return;
      }
      start.current = { y: e.touches[0].clientY, x: e.touches[0].clientX };
    };

    const onMove = (e: TouchEvent) => {
      if (!start.current) return;
      const dy = e.touches[0].clientY - start.current.y;
      const dx = Math.abs(e.touches[0].clientX - start.current.x);
      if (dy <= 0 || dx > dy) {
        if (pullRef.current) setPull((pullRef.current = 0));
        return;
      }
      // Resistance like iOS: the further you pull, the slower it moves
      const next = Math.min(MAX_PULL, dy * 0.5);
      if (pullRef.current < TRIGGER && next >= TRIGGER) haptic();
      pullRef.current = next;
      setPull(next);
    };

    const onEnd = async () => {
      if (!start.current) return;
      start.current = null;
      const reached = pullRef.current >= TRIGGER;
      pullRef.current = 0;
      if (!reached) {
        setPull(0);
        return;
      }
      setRefreshing(true);
      setPull(TRIGGER);
      try {
        await queryClient.refetchQueries({ type: "active" });
      } finally {
        setRefreshing(false);
        setPull(0);
      }
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
  }, [queryClient, refreshing]);

  if (pull === 0 && !refreshing) return null;
  const progress = Math.min(1, pull / TRIGGER);

  return (
    <div
      aria-live="polite"
      aria-label={refreshing ? "Refreshing" : undefined}
      className="pointer-events-none fixed inset-x-0 z-30 flex justify-center lg:hidden"
      style={{ top: `calc(var(--safe-top) + ${Math.max(0, pull - 28)}px)` }}
    >
      <span
        className="grid size-9 place-items-center rounded-full bg-surface-container-lowest text-primary shadow-lg"
        style={{ opacity: progress }}
      >
        <RefreshCw
          className={refreshing ? "h-[18px] w-[18px] animate-spin" : "h-[18px] w-[18px]"}
          style={refreshing ? undefined : { transform: `rotate(${progress * 270}deg)` }}
          aria-hidden
        />
      </span>
    </div>
  );
}
