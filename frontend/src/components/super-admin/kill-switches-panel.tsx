"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { Bot, Code2, Megaphone, Power, ShoppingBag, Workflow, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";
import { useSAKillSwitches, useSASetKillSwitch } from "@/hooks/use-super-admin";
import type { KillSwitch, KillSwitchFeature } from "@/lib/api/super-admin";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

const FEATURE_META: Record<KillSwitchFeature, { icon: typeof Power; stops: string }> = {
  campaigns: { icon: Megaphone, stops: "Starting, scheduling and sending campaigns. Running campaigns pause; scheduled ones wait." },
  automation: { icon: Workflow, stops: "Automation rules and follow-ups. Triggered runs are skipped, not queued." },
  api: { icon: Code2, stops: "Every Developer API request made with an API key." },
  ai: { icon: Bot, stops: "AI replies, summaries, scoring and generation, including chatbot AI." },
  shopify: { icon: ShoppingBag, stops: "Shopify order and cart events. Events are held for up to 24h." },
};

const REASON_MIN = 3;
const REASON_MAX = 500;

/** Server message from an API error (Nest sends a string or an array of strings). */
function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (Array.isArray(message)) return message.join(", ");
  return typeof message === "string" && message ? message : fallback;
}

function timeAgo(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Platform-wide per-feature OFF switches (System page → Kill switches). */
export function KillSwitchesPanel() {
  const { data: switches, isLoading, isError, refetch } = useSAKillSwitches();
  const setSwitch = useSASetKillSwitch();
  const reasonId = useId();
  const [disabling, setDisabling] = useState<KillSwitch | null>(null);
  const [enabling, setEnabling] = useState<KillSwitch | null>(null);
  const [reason, setReason] = useState("");

  const trimmed = reason.trim();
  const reasonValid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  const closeDisable = () => {
    setDisabling(null);
    setReason("");
  };

  const confirmDisable = () => {
    if (!disabling || !reasonValid) return;
    const sw = disabling;
    setSwitch.mutate(
      { feature: sw.feature, disabled: true, reason: trimmed },
      {
        onSuccess: () => {
          toast.success(`${sw.label} turned off for every organization`);
          closeDisable();
        },
        onError: (err) => toast.error(errorMessage(err, `Could not turn off ${sw.label}`)),
      },
    );
  };

  const confirmEnable = () => {
    if (!enabling) return;
    const sw = enabling;
    setSwitch.mutate(
      { feature: sw.feature, disabled: false },
      {
        onSuccess: () => {
          toast.success(`${sw.label} is back on`);
          setEnabling(null);
        },
        onError: (err) => {
          toast.error(errorMessage(err, `Could not turn ${sw.label} back on`));
          setEnabling(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-16" role="status">
          <Spinner size="lg" className="text-primary" />
          <span className="sr-only">Loading kill switches…</span>
        </div>
      </Card>
    );
  }

  if (isError || !switches) {
    return (
      <Alert variant="error">
        Could not load kill switches.{" "}
        <button type="button" onClick={() => refetch()} className="underline hover:no-underline">
          Try again
        </button>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-body text-on-surface-variant max-w-3xl">
        Incident controls. Turning a feature off blocks it for every organization right away, whatever their
        plan or overrides say, and background work for it stops too. Tenants see “temporarily unavailable”.
      </p>

      <Card className="!p-0">
        <ul className="divide-y divide-outline-variant/15">
          {switches.map((sw) => {
            const meta = FEATURE_META[sw.feature];
            const Icon = meta?.icon ?? Power;
            const on = !sw.disabled;
            return (
              <li key={sw.feature} className={cn("flex items-start gap-4 px-5 py-4", !on && "bg-error-container/40")}>
                <div
                  className={cn(
                    "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    on ? "bg-surface-container text-on-surface-variant" : "bg-error/10 text-error",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-lg font-medium text-on-surface">{sw.label}</span>
                    {on ? <Badge dot variant="muted">On</Badge> : <Badge dot variant="error">Off for all orgs</Badge>}
                  </div>
                  <p className="mt-0.5 text-label text-on-surface-variant">{meta?.stops}</p>
                  {!on && (
                    <div className="mt-2 space-y-0.5 text-label">
                      <p className="text-on-surface">
                        <span className="text-on-surface-variant">Reason: </span>
                        {sw.reason ?? "—"}
                      </p>
                      <p className="text-on-surface-variant">
                        Turned off by {sw.disabledBy?.name ?? sw.disabledBy?.email ?? "a super admin"}
                        {sw.disabledAt && (
                          <>
                            {" · "}
                            <time dateTime={sw.disabledAt} title={new Date(sw.disabledAt).toLocaleString()}>
                              {timeAgo(sw.disabledAt)}
                            </time>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${sw.label} available to organizations`}
                  disabled={setSwitch.isPending}
                  onClick={() => (on ? setDisabling(sw) : setEnabling(sw))}
                  className={cn(
                    "relative mt-1 h-5 w-9 shrink-0 rounded-full transition-colors outline-none",
                    "focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed",
                    on ? "bg-primary" : "bg-error",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-0.5 h-4 w-4 rounded-full bg-on-primary shadow-sm transition-transform",
                      on ? "translate-x-4" : "translate-x-0.5",
                    )}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </Card>

      <ConfirmDialog
        open={!!disabling}
        title={`Turn off ${disabling?.label ?? ""} for everyone?`}
        message={`This turns ${disabling?.label ?? "this feature"} off for every organization right now, including scheduled work.`}
        confirmLabel="Turn off"
        variant="danger"
        loading={setSwitch.isPending}
        confirmDisabled={!reasonValid}
        onConfirm={confirmDisable}
        onCancel={closeDisable}
      >
        <label htmlFor={reasonId} className="block text-label font-medium text-on-surface-variant mb-1">
          Reason (required)
        </label>
        <textarea
          id={reasonId}
          autoFocus
          rows={3}
          maxLength={REASON_MAX}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Meta API outage, sending paused until resolved"
          aria-describedby={`${reasonId}-hint`}
          className="w-full resize-y px-3 py-2 text-body-lg rounded-lg border border-outline-variant bg-surface-container-low text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30"
        />
        <p id={`${reasonId}-hint`} className="mt-0.5 text-label text-on-surface-variant">
          Shown to other super admins and kept in the audit log · {trimmed.length}/{REASON_MAX}
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!enabling}
        title={`Turn ${enabling?.label ?? ""} back on?`}
        message="Organizations can use it again within seconds. Paused campaigns stay paused until their owners resume them."
        confirmLabel="Turn on"
        variant="default"
        loading={setSwitch.isPending}
        onConfirm={confirmEnable}
        onCancel={() => setEnabling(null)}
      />
    </div>
  );
}

/** Dashboard banner shown while any kill switch is on. Renders nothing otherwise. */
export function KillSwitchBanner() {
  const { data: switches } = useSAKillSwitches();
  const off = (switches ?? []).filter((s) => s.disabled);
  if (off.length === 0) return null;

  return (
    <Alert variant="error" className="border border-error/30">
      <p className="font-semibold">
        {off.length === 1
          ? `${off[0].label} is turned off for every organization`
          : `${off.length} features are turned off for every organization`}
      </p>
      <ul className="mt-1 space-y-0.5 text-on-surface">
        {off.map((s) => (
          <li key={s.feature}>
            <span className="font-medium">{s.label}</span>
            {s.reason && <span className="text-on-surface-variant"> — {s.reason}</span>}
          </li>
        ))}
      </ul>
      <Link
        href="/super-admin/system?tab=kill-switches"
        className="mt-2 inline-flex items-center gap-0.5 font-medium underline hover:no-underline"
      >
        Manage kill switches <ArrowUpRight className="h-3 w-3" aria-hidden />
      </Link>
    </Alert>
  );
}
