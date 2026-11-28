"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { observabilityApi } from "@/lib/api/observability";
import { cn } from "@/lib/utils";

/** How often the top bar asks the backend if it is up */
const PING_EVERY_MS = 10 * 60 * 1000;

/**
 * Top bar card: pings the backend every 10 minutes and shows whether it answered and
 * how fast. Opens the full System Health page.
 */
export function ApiHealthCard() {
  const { data, isError, isPending } = useQuery({
    queryKey: ["sa", "api-ping"],
    queryFn: async () => {
      const start = performance.now();
      await observabilityApi.ping();
      return { latencyMs: Math.round(performance.now() - start), checkedAt: new Date() };
    },
    refetchInterval: PING_EVERY_MS,
    retry: false,
    staleTime: 0,
  });

  const state = isError ? "down" : isPending ? "checking" : "up";
  const label = state === "down" ? "API down" : state === "checking" ? "Checking…" : "API healthy";
  const detail = state === "up" && data ? `${data.latencyMs} ms` : null;

  return (
    <Link
      href="/super-admin/system"
      aria-label={`${label}${detail ? `, ${detail}` : ""}. Open System Health`}
      title={data ? `Last answer ${data.checkedAt.toLocaleTimeString()} · checked every 10 min` : "Checked every 10 min"}
      className={cn(
        "flex h-9 items-center gap-2 rounded-lg border px-2.5 text-label transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1",
        state === "down"
          ? "border-error/40 bg-error/10 text-error"
          : "border-outline-variant text-on-surface hover:bg-surface-container",
      )}
    >
      <span className="relative flex size-2 shrink-0" aria-hidden>
        {state === "up" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-success opacity-60 motion-safe:animate-ping" />
        )}
        <span
          className={cn(
            "relative inline-flex size-2 rounded-full",
            state === "up" ? "bg-success" : state === "down" ? "bg-error" : "bg-outline",
          )}
        />
      </span>
      {/* Phones: the dot alone says it; the words come in from sm up */}
      <span className="hidden font-medium sm:inline">{label}</span>
      {detail && <span className="hidden tabular-nums text-on-surface-variant lg:inline">{detail}</span>}
    </Link>
  );
}
