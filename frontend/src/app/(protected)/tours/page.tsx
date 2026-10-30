"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Play, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { Button } from "@/components/ui/button";
import { useAvailableTours } from "@/components/tour/tour-provider";
import { useTourProgress } from "@/hooks/use-tour-progress";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { usePageTitle } from "@/hooks/use-page-title";
import { useTourStore } from "@/stores/tour-store";
import { cn } from "@/lib/utils";
import type { TourDef } from "@/lib/tours/types";

/** Steps this layout shows, for "6 steps" */
function stepCount(tour: TourDef, mobile: boolean) {
  return tour.steps.filter((s) => !s.only || s.only === (mobile ? "mobile" : "desktop")).length;
}

/** Every product tour this user can take, with progress on this device, grouped like the menu. */
export default function ToursPage() {
  usePageTitle("Product tours");
  const router = useRouter();
  const tours = useAvailableTours();
  const progress = useTourProgress();
  const isMobile = useIsMobile();
  const queue = useTourStore((s) => s.queue);
  const start = useTourStore((s) => s.start);

  const groups = useMemo(() => {
    const map = new Map<string, TourDef[]>();
    for (const t of tours) {
      // The More screen exists on phones only
      if (t.id === "more" && !isMobile) continue;
      map.set(t.section, [...(map.get(t.section) ?? []), t]);
    }
    return [...map.entries()];
  }, [tours, isMobile]);

  const total = groups.reduce((n, [, list]) => n + list.length, 0);
  const done = groups.reduce((n, [, list]) => n + list.filter((t) => progress.isDone(t)).length, 0);

  const run = (tour: TourDef) => {
    // The welcome tour works on any screen: start it right here
    if (tour.match(window.location.pathname, new URLSearchParams(window.location.search))) {
      start(tour.id);
      return;
    }
    queue(tour.id);
    if (tour.startHint) toast(tour.startHint, { description: "The tour starts on that screen." });
    router.push(tour.startHref);
  };

  const replayAll = async () => {
    try {
      await progress.reset();
      toast.success("Tours reset. Each screen's tour plays again on your next visit.");
    } catch {
      toast.error("Couldn't reset tours. Try again.");
    }
  };

  return (
    <div className="space-y-5 p-4 md:p-6 max-lg:pt-2">
      <MobilePageActions more={[{ label: "Replay all tours", onSelect: replayAll, disabled: done === 0 }]} />
      <PageHeader
        className="max-lg:hidden"
        title="Product tours"
        description="Short walkthroughs of each screen, with examples."
        actions={
          <Button variant="secondary" onClick={replayAll} loading={progress.isResetting} disabled={done === 0}>
            <RotateCcw className="h-4 w-4" aria-hidden />
            Replay all
          </Button>
        }
      />

      {/* Progress on this device */}
      <section
        aria-labelledby="tours-progress"
        className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="tours-progress" className="text-body font-semibold text-on-surface">
            Your progress on this device
          </h2>
          <p className="text-body tabular-nums text-on-surface-variant">
            {done} of {total}
          </p>
        </div>
        <div
          className="mt-3 h-2 overflow-hidden rounded-full bg-surface-container-high"
          role="progressbar"
          aria-label="Tours completed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={done}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 ease-standard"
            style={{ width: total ? `${(done / total) * 100}%` : 0 }}
          />
        </div>
        {progress.isError && (
          <p className="mt-2 text-caption text-on-surface-variant">
            Progress couldn&apos;t be loaded, so tours won&apos;t start by themselves. You can still start any tour here.
          </p>
        )}
      </section>

      {groups.map(([section, list]) => (
        <section key={section} aria-labelledby={`tours-${section}`}>
          <h2
            id={`tours-${section}`}
            className="mb-2 px-1 text-caption font-semibold uppercase tracking-[0.08em] text-on-surface-variant"
          >
            {section}
          </h2>
          <ul className="divide-y divide-outline-variant overflow-hidden rounded-2xl border border-outline-variant bg-surface-container-lowest">
            {list.map((tour) => {
              const status = progress.statusOf(tour);
              const steps = stepCount(tour, isMobile);
              return (
                <li key={tour.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-8 shrink-0 place-items-center rounded-full",
                      status === "completed"
                        ? "bg-success-container text-success"
                        : "bg-surface-container-high text-on-surface-variant",
                    )}
                  >
                    {status === "completed" ? <Check className="h-4 w-4" /> : <Play className="h-3.5 w-3.5" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-body font-medium text-on-surface">
                      {tour.title}
                      <span className="sr-only">
                        {status === "completed" ? ", done" : status === "skipped" ? ", skipped" : ", not started"}
                      </span>
                    </p>
                    <p className="text-caption text-on-surface-variant">
                      {tour.summary}
                      <span className="whitespace-nowrap"> · {steps} {steps === 1 ? "step" : "steps"}</span>
                    </p>
                    {tour.startHint && <p className="mt-0.5 text-caption text-on-surface-variant">{tour.startHint}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant={status ? "secondary" : "primary"}
                    onClick={() => run(tour)}
                    aria-label={`${status ? "Replay" : "Start"} the ${tour.title} tour`}
                  >
                    {status ? "Replay" : "Start"}
                  </Button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
