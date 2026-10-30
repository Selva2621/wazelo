"use client";

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useNavSections } from "@/components/layout/nav-config";
import { useAuthStore } from "@/stores/auth-store";
import { useTourStore } from "@/stores/tour-store";
import { useTourProgress } from "@/hooks/use-tour-progress";
import { TOURS, WELCOME_TOUR_ID, getTour, tourForRoute } from "@/lib/tours/registry";
import type { TourDef } from "@/lib/tours/types";
import { TourOverlay } from "./tour-overlay";

/** Wait for the screen to render (and data to arrive) before a tour starts by itself */
const AUTO_START_DELAY_MS = 1200;

/** Tours this user can take: same role / plan / org-type rules as the menu */
export function useAvailableTours(): TourDef[] {
  const { sections, isFreelancer } = useNavSections();
  const role = useAuthStore((s) => s.user?.role);

  return useMemo(() => {
    const visible = new Set(sections.flatMap((s) => s.items.map((i) => i.href)));
    return TOURS.filter((t) => {
      if (t.navHref && !visible.has(t.navHref)) return false;
      if (t.roles && (!role || !t.roles.includes(role))) return false;
      if (t.orgType === "FREELANCER" && !isFreelancer) return false;
      if (t.orgType === "TEAM" && isFreelancer) return false;
      return true;
    });
  }, [sections, isFreelancer, role]);
}

/** A dialog the user is working in (create modal, sheet): don't start a tour over it */
function somethingIsOpen() {
  return document.querySelector("[aria-modal='true']:not([data-tour-card]), [role='dialog'][data-state='open']") !== null;
}

/**
 * Runs product tours: the welcome tour once per device, then each screen's tour the
 * first time that screen opens. Tours started from the Tours page or the ? button
 * run straight away. Progress is saved per user and device on the server.
 */
export function TourProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeId = useTourStore((s) => s.activeId);
  const pendingId = useTourStore((s) => s.pendingId);
  const autoTried = useTourStore((s) => s.autoTried);
  const start = useTourStore((s) => s.start);
  const stop = useTourStore((s) => s.stop);
  const markAutoTried = useTourStore((s) => s.markAutoTried);
  const queue = useTourStore((s) => s.queue);
  const progress = useTourProgress();
  const available = useAvailableTours();

  const search = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams]);
  const activeTour = getTour(activeId);

  // Started from the Tours page: run once its screen is open
  useEffect(() => {
    if (!pendingId || activeId) return;
    const tour = getTour(pendingId);
    if (!tour) return;
    if (!tour.match(pathname, search)) {
      // Detail tours wait on their list page; going anywhere else drops the request
      const onTheWay = pathname === "/tours" || pathname === tour.startHref;
      if (!onTheWay) queue(null);
      return;
    }
    const timer = window.setTimeout(() => start(tour.id), 600);
    return () => window.clearTimeout(timer);
  }, [pendingId, activeId, pathname, search, start, queue]);

  // First visit: welcome tour first, then this screen's tour
  let autoId: string | undefined;
  if (progress.ready) {
    const welcome = available.find((t) => t.id === WELCOME_TOUR_ID);
    const screen = tourForRoute(available, pathname, search);
    const next =
      welcome && !progress.isDone(welcome)
        ? welcome
        : screen && screen.auto !== false && !progress.isDone(screen)
          ? screen
          : undefined;
    if (next && !autoTried.includes(next.id)) autoId = next.id;
  }

  useEffect(() => {
    if (!autoId || activeId || pendingId) return;
    let timer = 0;
    const attempt = () => {
      // A dialog is open (e.g. a create form): try again shortly instead of covering it
      if (somethingIsOpen()) {
        timer = window.setTimeout(attempt, 1500);
        return;
      }
      markAutoTried(autoId);
      start(autoId);
    };
    timer = window.setTimeout(attempt, AUTO_START_DELAY_MS);
    return () => window.clearTimeout(timer);
    // pathname: restart the wait on every new screen
  }, [autoId, activeId, pendingId, pathname, markAutoTried, start]);

  // Leaving the screen ends its tour (the welcome tour works on any screen)
  useEffect(() => {
    if (activeTour && activeTour.id !== WELCOME_TOUR_ID && !activeTour.match(pathname, search)) stop();
  }, [activeTour, pathname, search, stop]);

  const { markDone } = progress;
  const handleClose = useCallback(
    (status: "completed" | "skipped") => {
      if (activeTour) markDone(activeTour, status);
      stop();
    },
    [activeTour, markDone, stop],
  );

  if (!activeTour) return null;
  return <TourOverlay key={activeTour.id} tour={activeTour} onClose={handleClose} />;
}
