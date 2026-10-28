"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ShieldCheck, ShieldAlert, ShieldOff, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusChipSegment, statusChipTone } from "@/components/ui/status-chip";
import { useResumeSending, useSendHealth } from "@/hooks/use-whatsapp";
import type { SendHealth } from "@/lib/api/whatsapp";

const riskConfig = {
  ok: { label: "Safe", variant: "success", icon: ShieldCheck, tone: "ok" },
  warning: { label: "Careful", variant: "warning", icon: ShieldAlert, tone: "warning" },
  paused: { label: "Paused", variant: "error", icon: ShieldOff, tone: "error" },
} as const;

const formatHour = (h: number) => `${String(h).padStart(2, "0")}:00`;

function UsageBar({ value, max }: { value: number; max: number }) {
  const pct = Math.min(100, max > 0 ? (value / max) * 100 : 0);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-high" aria-hidden>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-300",
          pct >= 100 ? "bg-error" : pct >= 80 ? "bg-warning" : "bg-primary",
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-start gap-3">
      <span className="text-label text-on-surface-variant">{label}</span>
      <div className="min-w-0 text-body text-on-surface">{children}</div>
    </div>
  );
}

/** The health rows — shared by the settings card and the header popover. */
export function AccountHealthDetails({ health }: { health: SendHealth }) {
  const resume = useResumeSending();
  const rate = health.delivery.rate;

  return (
    <div className="space-y-3.5">
      {health.paused && (
        <div className="rounded-lg bg-error-container/60 px-3 py-2.5 text-label text-error">
          <p className="font-medium">Campaigns and sequences paused</p>
          <p className="mt-0.5 text-on-surface-variant">
            {health.paused.reason ?? "Bulk sending paused"} · until{" "}
            {new Date(health.paused.until).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
          </p>
          <Button
            size="sm"
            variant="ghost"
            className="mt-1.5 -ml-2 text-error"
            loading={resume.isPending}
            onClick={() => resume.mutate()}
          >
            Resume anyway
          </Button>
        </div>
      )}

      <Row label="Warm-up">
        <div className="flex items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((s) => (
              <span
                key={s}
                className={cn("h-1.5 w-5 rounded-full", s <= health.warmup.stage ? "bg-primary" : "bg-surface-container-high")}
              />
            ))}
          </span>
          <span className="text-label text-on-surface-variant">
            {health.warmup.stage === 4 ? "Complete" : `Stage ${health.warmup.stage}`} · day {health.warmup.linkedDays + 1}
          </span>
        </div>
      </Row>

      <Row label="Today">
        <div className="space-y-2">
          <div>
            <div className="mb-1 flex justify-between text-label">
              <span className="text-on-surface-variant">Bulk messages</span>
              <span className="tabular-nums">{health.today.bulkSent} / {health.warmup.bulkCap}</span>
            </div>
            <UsageBar value={health.today.bulkSent} max={health.warmup.bulkCap} />
          </div>
          <div>
            <div className="mb-1 flex justify-between text-label">
              <span className="text-on-surface-variant">New contacts</span>
              <span className="tabular-nums">{health.today.coldSent} / {health.warmup.coldCap}</span>
            </div>
            <UsageBar value={health.today.coldSent} max={health.warmup.coldCap} />
          </div>
        </div>
      </Row>

      <Row label="Delivery">
        {rate === null ? (
          <span className="text-on-surface-variant">No bulk messages in the last 24h</span>
        ) : (
          <span className={cn("tabular-nums", rate < 0.6 ? "text-error" : rate < 0.8 ? "text-warning" : undefined)}>
            {Math.round(rate * 100)}%
            <span className="ml-1 text-label text-on-surface-variant">of {health.delivery.sampled} · last 24h</span>
          </span>
        )}
      </Row>

      {health.optOuts24h > 0 && (
        <Row label="Opt-outs">
          <span className="tabular-nums">{health.optOuts24h} in the last 24h</span>
        </Row>
      )}

      <Row label="Sending">
        <span>
          {formatHour(health.sendingHours.start)}–{formatHour(health.sendingHours.end)}
          <span className="ml-1 text-label text-on-surface-variant">{health.sendingHours.timeZone}</span>
        </span>
      </Row>
    </div>
  );
}

/** Settings › WhatsApp card. */
export function AccountHealthCard({ className }: { className?: string }) {
  const { data: health } = useSendHealth();
  if (!health) return null;
  const risk = riskConfig[health.risk];

  return (
    <Card className={cn("w-full max-w-md text-left", className)}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-title-sm font-semibold text-on-surface">Account health</h3>
        <Badge variant={risk.variant}>
          <risk.icon className="h-3.5 w-3.5" />
          {risk.label}
        </Badge>
      </div>
      <AccountHealthDetails health={health} />
      <p className="mt-4 flex gap-1.5 text-caption text-on-surface-variant">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Limits grow as your number ages. Campaigns only go to people who have messaged you.
      </p>
    </Card>
  );
}

/** Header pill with a popover — visible on every page. */
export function AccountHealthPill() {
  const { data: health } = useSendHealth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!health) return null;
  const risk = riskConfig[health.risk];

  return (
    <div className="relative hidden sm:block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="WhatsApp account health"
        className={cn(statusChipSegment, statusChipTone[risk.tone])}
      >
        <risk.icon className="h-3.5 w-3.5 shrink-0" />
        <span className="hidden xl:inline">WhatsApp</span> {risk.label}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="WhatsApp account health"
            className="absolute right-0 top-full z-40 mt-2 w-80 origin-top-right rounded-xl bg-surface-container p-4 shadow-popover"
            initial={{ opacity: 0, scale: 0.96, y: -motionTokens.distance.sm }}
            animate={{ opacity: 1, scale: 1, y: 0, transition: springs.snappy }}
            exit={{ opacity: 0, scale: 0.98, transition: { duration: motionTokens.duration.fast, ease: motionTokens.easing.exit } }}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-body font-medium text-on-surface">Account health</p>
              <Badge dot variant={risk.variant}>{risk.label}</Badge>
            </div>
            <AccountHealthDetails health={health} />
            <Link
              href="/settings/whatsapp"
              onClick={() => setOpen(false)}
              className="mt-4 block text-label font-medium text-primary hover:underline"
            >
              WhatsApp settings
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One-line capacity notice for the create-campaign screen. */
export function CampaignCapacityNotice({ className }: { className?: string }) {
  const { data: health } = useSendHealth();
  if (!health) return null;

  const remaining = Math.max(0, health.warmup.bulkCap - health.today.bulkSent);
  const tone = health.paused ? "error" : remaining === 0 ? "warning" : "info";

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-label",
        tone === "error" && "bg-error-container/60 text-error",
        tone === "warning" && "bg-warning-container text-warning",
        tone === "info" && "bg-surface-container text-on-surface-variant",
        className,
      )}
    >
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        {health.paused
          ? `Campaign sending is paused for your number (${health.paused.reason ?? "safety check"}). New campaigns will wait.`
          : remaining === 0
            ? "Today's sending limit is used up — this campaign will start tomorrow morning."
            : `Today you can still send ${remaining} bulk messages (warm-up ${health.warmup.stage === 4 ? "complete" : `stage ${health.warmup.stage}`}).`}{" "}
        Only contacts who have messaged you receive campaigns, between{" "}
        {formatHour(health.sendingHours.start)}–{formatHour(health.sendingHours.end)}.
      </p>
    </div>
  );
}
