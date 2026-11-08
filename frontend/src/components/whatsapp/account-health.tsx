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
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useResumeSending, useSendHealth, useUpdateSendingLimits } from "@/hooks/use-whatsapp";
import { useAuthStore } from "@/stores/auth-store";
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

/** Today's count against a per-number cap, or just the count when there is no cap. */
function CapRow({ label, sent, cap }: { label: string; sent: number; cap: number | null }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-label">
        <span className="text-on-surface-variant">{label}</span>
        <span className="tabular-nums">
          {cap === null ? <>{sent} <span className="text-on-surface-variant">· no daily cap</span></> : `${sent} / ${cap}`}
        </span>
      </div>
      {cap !== null && <UsageBar value={sent} max={cap} />}
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

      {health.limitMode !== "plan" && (
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
            {health.limitMode === "custom"
              ? "Custom daily limits"
              : `${health.warmup.stage === 4 ? "Complete" : `Stage ${health.warmup.stage}`} · day ${health.warmup.linkedDays + 1}`}
          </span>
        </div>
      </Row>
      )}

      {health.plan && (
        <Row label="Plan">
          {health.plan.limit === null ? (
            <span>
              Unlimited
              <span className="ml-1 text-label text-on-surface-variant tabular-nums">{health.plan.used} sent this period</span>
            </span>
          ) : (
            <div>
              <div className="mb-1 flex justify-between text-label">
                <span className="text-on-surface-variant">Messages this period</span>
                <span className="tabular-nums">{health.plan.used} / {health.plan.limit}</span>
              </div>
              <UsageBar value={health.plan.used} max={health.plan.limit} />
            </div>
          )}
        </Row>
      )}

      <Row label="Today">
        <div className="space-y-2">
          <CapRow label="Bulk messages" sent={health.today.bulkSent} cap={health.warmup.bulkCap} />
          <CapRow label="New contacts" sent={health.today.coldSent} cap={health.warmup.coldCap} />
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

/** Heading + health rows, without a card — for placing inside another card's section. */
export function AccountHealthSection({ className }: { className?: string }) {
  const { data: health } = useSendHealth();
  const isAdmin = useAuthStore((s) => s.user?.role === "ADMIN");
  if (!health) return null;
  const risk = riskConfig[health.risk];

  return (
    <section aria-labelledby="account-health-title" className={cn("text-left", className)}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 id="account-health-title" className="text-title-sm font-semibold text-on-surface">
          Account health
        </h3>
        <Badge variant={risk.variant}>
          <risk.icon className="h-3.5 w-3.5" aria-hidden />
          {risk.label}
        </Badge>
      </div>
      <AccountHealthDetails health={health} />
      <p className="mt-4 flex gap-1.5 text-caption text-on-surface-variant">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        {health.limitMode === "plan" || health.limitMode === undefined
          ? "Campaigns send as many messages as your plan allows, paced like a person typing."
          : "This number has daily limits set. Messages over a limit wait for the next day."}
      </p>
      {isAdmin && health.limits && <SendingLimitsForm health={health} />}
    </section>
  );
}

const numOrUndef = (v: string) => {
  const n = Number.parseInt(v, 10);
  return v.trim() === "" || Number.isNaN(n) ? undefined : n;
};

/** Admin: optional per-number daily limits (off = plan limit only). */
function SendingLimitsForm({ health }: { health: SendHealth }) {
  const update = useUpdateSendingLimits();
  const limits = health.limits ?? {};
  const [warmup, setWarmup] = useState(limits.warmupEnabled === true);
  const [stage, setStage] = useState(limits.warmupStage ? String(limits.warmupStage) : "");
  const [bulkCap, setBulkCap] = useState(limits.dailyBulkCap !== undefined ? String(limits.dailyBulkCap) : "");
  const [coldCap, setColdCap] = useState(limits.dailyColdCap !== undefined ? String(limits.dailyColdCap) : "");
  const [gapSec, setGapSec] = useState(
    limits.bulkGapMinMs !== undefined ? String(Math.round(limits.bulkGapMinMs / 1000)) : "",
  );

  const save = () => {
    const gap = numOrUndef(gapSec);
    update.mutate({
      ...(warmup && { warmupEnabled: true }),
      ...(warmup && numOrUndef(stage) !== undefined && { warmupStage: numOrUndef(stage) }),
      ...(numOrUndef(bulkCap) !== undefined && { dailyBulkCap: numOrUndef(bulkCap) }),
      ...(numOrUndef(coldCap) !== undefined && { dailyColdCap: numOrUndef(coldCap) }),
      // One number: the gap varies ±50% around it so sends don't look scripted
      ...(gap !== undefined && { bulkGapMinMs: gap * 1000, bulkGapMaxMs: Math.round(gap * 1.5) * 1000 }),
    });
  };

  const error = (update.error as { response?: { data?: { message?: string | string[] } } } | null)?.response?.data?.message;

  return (
    <div className="mt-5 space-y-3 border-t border-outline-variant pt-4">
      <div>
        <p className="text-body font-medium text-on-surface">Sending limits</p>
        <p className="text-caption text-on-surface-variant">
          Optional, for this number. Leave empty for no daily cap: your plan&apos;s message limit applies.
        </p>
      </div>
      <label className="flex items-center justify-between gap-3 text-label text-on-surface">
        <span>
          Warm-up for a new number
          <span className="block text-caption text-on-surface-variant">Starts at 20 new contacts a day and grows weekly</span>
        </span>
        <Switch checked={warmup} onChange={setWarmup} aria-label="Warm-up for a new number" />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {warmup && (
          <LimitField label="Start at stage (1–4)" value={stage} onChange={setStage} placeholder="By age" min={1} max={4} />
        )}
        <LimitField label="Bulk messages / day" value={bulkCap} onChange={setBulkCap} placeholder="No cap" min={0} max={1000} />
        <LimitField label="New contacts / day" value={coldCap} onChange={setColdCap} placeholder="No cap" min={0} max={1000} />
        <LimitField
          label="Seconds between messages"
          value={gapSec}
          onChange={setGapSec}
          placeholder={health.bulkGapMs ? `${Math.round(health.bulkGapMs.min / 1000)}–${Math.round(health.bulkGapMs.max / 1000)}` : "10–40"}
          min={5}
          max={400}
        />
      </div>
      {error && <p className="text-label text-error">{Array.isArray(error) ? error.join(", ") : error}</p>}
      <Button size="sm" onClick={save} loading={update.isPending}>
        Save limits
      </Button>
    </div>
  );
}

function LimitField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  min: number;
  max: number;
}) {
  return (
    <label className="block text-caption text-on-surface-variant">
      {props.label}
      <Input
        type="number"
        inputMode="numeric"
        min={props.min}
        max={props.max}
        value={props.value}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
        className="mt-1"
      />
    </label>
  );
}

/** Settings › WhatsApp card. */
export function AccountHealthCard({ className }: { className?: string }) {
  const { data: health } = useSendHealth();
  if (!health) return null;
  return (
    <Card className={cn("w-full max-w-md", className)}>
      <AccountHealthSection />
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

  // Smallest of today's per-number cap and the plan's remaining messages (null = no limit)
  const dailyLeft =
    health.remaining?.bulk ??
    (health.warmup.bulkCap === null ? null : Math.max(0, health.warmup.bulkCap - health.today.bulkSent));
  const planLeft = health.plan?.remaining ?? null;
  const remaining =
    dailyLeft === null ? planLeft : planLeft === null ? dailyLeft : Math.min(dailyLeft, planLeft);
  const planBound = planLeft !== null && (dailyLeft === null || planLeft <= dailyLeft);
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
          : remaining === null
            ? "Your plan has no message limit."
            : remaining === 0
              ? planBound
                ? "Your plan's messages for this period are used up — upgrade to send this campaign."
                : "This number's daily limit is used up — this campaign will start tomorrow."
              : planBound
                ? `Your plan has ${remaining} messages left this period.`
                : `This number can still send ${remaining} bulk messages today.`}{" "}
        Campaigns send{" "}
        {formatHour(health.campaignHours?.start ?? health.sendingHours.start)}–
        {formatHour(health.campaignHours?.end ?? health.sendingHours.end)}.
      </p>
    </div>
  );
}
