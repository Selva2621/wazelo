"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useBotBehavior, useSaveBotBehavior } from "@/hooks/use-chatbot";
import type { BotBehaviorInput } from "@/lib/api/chatbot";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

const field =
  "w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body text-on-surface placeholder:text-placeholder outline-none hover:border-outline focus:border-primary focus:ring-2 focus:ring-primary/30";
const label = "text-label font-medium text-on-surface";
const hint = "text-label text-on-surface-variant";

const DAYS = [
  { day: 1, short: "Mon" },
  { day: 2, short: "Tue" },
  { day: 3, short: "Wed" },
  { day: 4, short: "Thu" },
  { day: 5, short: "Fri" },
  { day: 6, short: "Sat" },
  { day: 0, short: "Sun" },
];
const PAUSE_OPTIONS = [4, 12, 24, 48, 72];

const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const toMinute = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : 0;
};

function errorMessage(err: unknown, fallback: string): string {
  return (err as { message?: string })?.message || fallback;
}

/** When the AI bot hands a chat to the team, and the team's opening hours. */
export function HandoverCard({ className }: { className?: string }) {
  const { data: saved, isLoading } = useBotBehavior();
  const save = useSaveBotBehavior();
  const [edits, setEdits] = useState<BotBehaviorInput>({});

  if (isLoading || !saved) {
    return <section aria-label="Handover and hours" className={cn("h-40 animate-pulse p-5", className)} />;
  }

  const v = { ...saved, ...edits };
  const set = (patch: BotBehaviorInput) => setEdits((e) => ({ ...e, ...patch }));
  const dirty = Object.keys(edits).length > 0;
  const sameTimes = v.hoursEnabled && v.openMinute === v.closeMinute;
  const valid = v.handoffMessage.trim() && v.afterHoursMessage.trim() && !sameTimes && (!v.hoursEnabled || v.openDays.length > 0);

  const toggleDay = (day: number) =>
    set({ openDays: v.openDays.includes(day) ? v.openDays.filter((d) => d !== day) : [...v.openDays, day] });

  return (
    <section aria-labelledby="handover-heading" className={cn("space-y-4 p-5", className)}>
      <div>
        <h2 id="handover-heading" className="text-body-lg font-medium text-on-surface">
          Handover &amp; hours
        </h2>
        <p className={hint}>
          The bot hands a chat to your team when the customer asks for a person, or after 2 questions it can&apos;t answer.
        </p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="handoff-message" className={label}>
          Handover message
        </label>
        <textarea
          id="handoff-message"
          value={v.handoffMessage}
          onChange={(e) => set({ handoffMessage: e.target.value.slice(0, 500) })}
          rows={2}
          className={cn(field, "resize-y")}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 text-body text-on-surface">
        <label htmlFor="pause-hours">After your team replies, the bot stays quiet in that chat for</label>
        <select
          id="pause-hours"
          value={v.pauseHours}
          onChange={(e) => set({ pauseHours: Number(e.target.value) })}
          className="rounded-lg border border-outline-variant bg-surface px-2 py-1 text-body outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
        >
          {[...new Set([...PAUSE_OPTIONS, saved.pauseHours])].sort((a, b) => a - b).map((h) => (
            <option key={h} value={h}>
              {h} hours
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-3 border-t border-outline-variant pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p id="hours-label" className={label}>
              Opening hours
            </p>
            <p className={hint}>
              {v.hoursEnabled ? (
                <>
                  Times in {saved.timezone} ·{" "}
                  <Link href="/settings" className="text-primary underline-offset-2 hover:underline">
                    Change
                  </Link>
                </>
              ) : (
                "Off: the handover message is always used."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {saved.hoursEnabled && !dirty && (
              <Badge variant={saved.openNow ? "success" : "muted"}>{saved.openNow ? "Open now" : "Closed now"}</Badge>
            )}
            <Switch aria-labelledby="hours-label" checked={v.hoursEnabled} onChange={(on) => set({ hoursEnabled: on })} />
          </div>
        </div>

        {v.hoursEnabled && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="time"
                aria-label="Opens at"
                value={toTime(v.openMinute)}
                onChange={(e) => set({ openMinute: toMinute(e.target.value) })}
                className={cn(field, "w-auto")}
              />
              <span className={hint}>to</span>
              <input
                type="time"
                aria-label="Closes at"
                value={toTime(v.closeMinute)}
                onChange={(e) => set({ closeMinute: toMinute(e.target.value) })}
                className={cn(field, "w-auto")}
              />
            </div>
            {sameTimes && <p className="text-label text-error">Opening and closing time must be different.</p>}

            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Open days">
              {DAYS.map(({ day, short }) => {
                const on = v.openDays.includes(day);
                return (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDay(day)}
                    className={cn(
                      "h-8 min-w-11 rounded-full border px-3 text-label font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/40",
                      on
                        ? "border-primary bg-primary text-on-primary"
                        : "border-outline-variant text-on-surface-variant hover:border-outline",
                    )}
                  >
                    {short}
                  </button>
                );
              })}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="after-hours-message" className={label}>
                Message when closed
              </label>
              <textarea
                id="after-hours-message"
                value={v.afterHoursMessage}
                onChange={(e) => set({ afterHoursMessage: e.target.value.slice(0, 500) })}
                rows={2}
                className={cn(field, "resize-y")}
              />
              <p className={hint}>Sent instead of the handover message outside these hours.</p>
            </div>
          </>
        )}
      </div>

      {dirty && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setEdits({})} disabled={save.isPending}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!valid}
            loading={save.isPending}
            onClick={() =>
              save.mutate(
                {
                  ...edits,
                  ...(edits.handoffMessage !== undefined && { handoffMessage: edits.handoffMessage.trim() }),
                  ...(edits.afterHoursMessage !== undefined && { afterHoursMessage: edits.afterHoursMessage.trim() }),
                  // Times are checked together on the server
                  ...((edits.openMinute !== undefined || edits.closeMinute !== undefined) && {
                    openMinute: v.openMinute,
                    closeMinute: v.closeMinute,
                  }),
                },
                {
                  onSuccess: () => {
                    toast.success("Saved");
                    setEdits({});
                  },
                  onError: (err) => toast.error(errorMessage(err, "Couldn't save")),
                },
              )
            }
          >
            Save
          </Button>
        </div>
      )}
    </section>
  );
}
