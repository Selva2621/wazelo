"use client";

import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import { useWaitingChats } from "@/hooks/use-analytics";
import { cn } from "@/lib/utils";

const CHANNEL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  FACEBOOK_MESSENGER: "Messenger",
  EMAIL: "Email",
};

function formatWait(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / (24 * 60))}d`;
}

/** Customers waiting 15+ minutes for a reply, oldest first. Hidden when nobody is waiting. */
export function WaitingChatsCard() {
  const { data } = useWaitingChats();
  if (!data?.total) return null;

  const more = data.total - data.items.length;

  return (
    <section
      data-tour="dash-waiting"
      aria-labelledby="waiting-title"
      className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 max-lg:p-4"
    >
      <div className="mb-3 flex items-baseline gap-2">
        <h2 id="waiting-title" className="text-title-sm font-semibold text-on-surface">
          Waiting for reply
        </h2>
        <span className="text-body tabular-nums text-on-surface-variant">{data.total}</span>
        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-caption font-medium text-warning">
          {data.minMinutes}+ min
        </span>
      </div>

      <ul className="divide-y divide-outline-variant/10">
        {data.items.map((c) => {
          const late = c.waitingMinutes >= 60;
          return (
            <li key={c.conversationId} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium text-on-surface">{c.name || c.phone}</p>
                <p className="truncate text-caption text-on-surface-variant">
                  {CHANNEL[c.channelType] ?? "Chat"} · {c.assignee ? c.assignee.name : "Unassigned"}
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 text-label tabular-nums",
                  late ? "font-semibold text-error" : "text-warning",
                )}
                title={`Waiting ${c.waitingMinutes} minutes`}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden />
                {formatWait(c.waitingMinutes)}
              </span>
              <Link
                href={`/inbox?phone=${encodeURIComponent(c.phone)}`}
                className="inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 text-label text-on-surface hover:bg-surface-container"
                aria-label={`Reply to ${c.name || c.phone}`}
              >
                Reply <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>

      {more > 0 && (
        <Link href="/inbox" className="mt-3 inline-block text-label font-medium text-primary hover:underline">
          {more} more waiting in the inbox
        </Link>
      )}
    </section>
  );
}
