"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useBotInsights } from "@/hooks/use-chatbot";
import type { BotInsights } from "@/lib/api/chatbot";
import { cn } from "@/lib/utils";

/** What each safety stop means, in the owner's words */
const REASONS: Record<string, string> = {
  UNKNOWN_LINK: "Reply had a link you never shared",
  UNKNOWN_PHONE: "Reply had a phone number you never shared",
  PROMPT_LEAK: "Someone tried to get the bot's rules",
  chat: "Too many bot replies in one chat today",
  session: "Too many messages from one website visitor",
  ip: "Too many messages from one device",
  org: "Website bot hit its hourly limit",
};

function timeAgo(iso: string): string {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.round(hours / 24)}d ago`;
}

function Stat({ value, label, tone }: { value: string; label: string; tone?: "warning" }) {
  return (
    <div className="px-4 py-3 max-lg:px-3">
      <div className={cn("text-title font-semibold tabular-nums", tone === "warning" ? "text-warning" : "text-on-surface")}>{value}</div>
      <div className="text-label text-on-surface-variant">{label}</div>
    </div>
  );
}

function SuspiciousCard({ items }: { items: BotInsights["suspicious"] }) {
  return (
    <section
      aria-labelledby="suspicious-title"
      className="rounded-xl border border-warning/30 bg-warning/5 p-4"
    >
      <h2 id="suspicious-title" className="flex items-center gap-2 text-body-lg font-semibold text-on-surface">
        <ShieldAlert className="h-4 w-4 text-warning" aria-hidden />
        Suspicious messages ({items.length})
      </h2>
      <p className="text-label text-on-surface-variant mt-0.5">
        The bot stopped these replies to keep your chats safe. A person took over where needed.
      </p>
      <ul className="mt-3 divide-y divide-outline-variant/30">
        {items.slice(0, 5).map((s) => (
          <li key={s.id} className="flex items-center justify-between gap-3 py-2 max-lg:min-h-12">
            <div className="min-w-0">
              <div className="text-body text-on-surface truncate">{REASONS[s.reason ?? ""] ?? "Reply stopped by a safety check"}</div>
              <div className="text-label text-on-surface-variant">
                {s.channel === "WIDGET" ? "Website" : "WhatsApp"} · {timeAgo(s.at)}
                {s.repeats > 1 && <> · {s.repeats} times in this chat</>}
                {s.repeats >= 3 && s.channel === "WHATSAPP" && <> · bot paused here for 7 days</>}
              </div>
            </div>
            {s.contactPhone && (
              <Link
                href={`/inbox?phone=${encodeURIComponent(s.contactPhone)}`}
                className="shrink-0 text-label font-medium text-primary hover:underline max-lg:min-h-11 max-lg:flex max-lg:items-center"
              >
                Open chat
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Top of the Chatbot page: how the AI bot did this week, and the replies its safety
 * checks stopped. Hidden until the bot has done something.
 */
export function BotHealthStrip({ className }: { className?: string }) {
  const { data } = useBotInsights();
  if (!data || data.total === 0) return null;

  const rate = data.answerRate === null ? "–" : `${Math.round(data.answerRate * 100)}%`;
  return (
    <div className={cn("space-y-3", className)}>
      <section aria-label={`AI bot, last ${data.days} days`} className="rounded-xl border border-outline-variant/10 bg-surface-container-lowest">
        <div className="grid grid-cols-4 divide-x divide-outline-variant/20 max-sm:grid-cols-2 max-sm:divide-x-0 max-sm:[&>*:nth-child(odd)]:border-r max-sm:[&>*:nth-child(odd)]:border-outline-variant/20 max-sm:[&>*:nth-child(-n+2)]:border-b max-sm:[&>*:nth-child(-n+2)]:border-outline-variant/20">
          <Stat value={rate} label="answered by the bot" />
          <Stat value={String(data.handedOff)} label="handed to your team" />
          <Stat value={String(data.blocked + data.limited)} label="stopped by safety checks" tone={data.blocked + data.limited ? "warning" : undefined} />
          <Stat value={String(data.credits)} label={`AI credits, ${data.days} days`} />
        </div>
      </section>
      {data.suspicious.length > 0 && <SuspiciousCard items={data.suspicious} />}
    </div>
  );
}
