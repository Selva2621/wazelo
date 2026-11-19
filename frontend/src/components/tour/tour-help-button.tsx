"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { IconButton } from "@/components/ui/icon-button";
import { Tooltip } from "@/components/ui/tooltip";
import { haptic } from "@/lib/haptics";
import { useTourStore } from "@/stores/tour-store";
import { tourForRoute } from "@/lib/tours/registry";
import { useAvailableTours } from "./tour-provider";

/** This screen's tour, and a way to run it again (any number of times; progress isn't needed). */
function usePageTour() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const start = useTourStore((s) => s.start);
  const available = useAvailableTours();
  const tour = useMemo(
    () => tourForRoute(available, pathname, new URLSearchParams(searchParams.toString())),
    [available, pathname, searchParams],
  );
  return { tour, replay: () => tour && start(tour.id) };
}

/** Header "?" (desktop): replays this screen's tour, or opens the Tours page when it has none. */
export function TourHelpButton() {
  const router = useRouter();
  const { tour, replay } = usePageTour();
  const label = tour ? `Take the ${tour.title} tour` : "Product tours";

  return (
    <Tooltip content={label} side="bottom">
      <IconButton
        data-tour="help"
        className="max-lg:hidden"
        aria-label={label}
        onClick={() => (tour ? replay() : router.push("/tours"))}
      >
        <CircleHelp className="h-5 w-5" aria-hidden />
      </IconButton>
    </Tooltip>
  );
}

/** Mobile top bar "?": replays this screen's tour. Hidden on screens without one. */
export function MobileTourButton({ android }: { android: boolean }) {
  const { tour, replay } = usePageTour();
  if (!tour) return null;

  return (
    <button
      type="button"
      data-tour="m-help"
      onClick={() => {
        haptic();
        replay();
      }}
      aria-label={`Take the ${tour.title} tour`}
      className={
        android
          ? "m3-icon-button text-on-surface-variant"
          : "grid size-11 place-items-center rounded-full text-primary active:opacity-50"
      }
    >
      <CircleHelp className={android ? "h-6 w-6" : "h-[22px] w-[22px]"} strokeWidth={2} aria-hidden />
    </button>
  );
}
