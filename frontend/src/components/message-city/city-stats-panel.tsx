"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useInboxStore } from "@/stores/inbox-store";
import Link from "next/link";
import type {
  CityInsightsResponse,
  LiveChannelStat,
  LiveChannelStatsResponse,
  LiveLeadsResponse,
} from "@/lib/types/analytics";
import { channelConfig, formatMinutes, REPLY_WORD, replyLevel, totalOf } from "./city-config";
import { DeliveryFunnel, HourlyChart } from "./city-channel-charts";

const LEVEL_DOT = { fast: "bg-success", ok: "bg-warning", slow: "bg-error", none: "bg-outline" } as const;
import { useCityStore } from "./use-city-store";

const fmt = (n: number) => n.toLocaleString("en-IN");

function sinceLabel(iso: string | null) {
  if (!iso) return "No messages yet today";
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "Last message just now";
  if (mins < 60) return `Last message ${mins} min ago`;
  return `Last message at ${new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

function Row({ label, value, tone }: { label: string; value: number; tone?: "error" }) {
  return (
    <div className="flex items-baseline justify-between py-2">
      <dt className="text-body text-on-surface-variant">{label}</dt>
      <dd className={`text-body font-medium tabular-nums ${tone === "error" && value > 0 ? "text-error" : "text-on-surface"}`}>
        {fmt(value)}
      </dd>
    </div>
  );
}

function ago(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

/** The dock: today's leads, newest first */
function LeadsPanel({ leads, onClose }: { leads: LiveLeadsResponse | undefined; onClose: () => void }) {
  return (
    <aside data-tour="city-panel" className="rounded-xl bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full bg-primary" aria-hidden />
          <p className="text-title font-semibold text-on-surface">Leads today</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          aria-label="Back to all channels"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-display font-semibold tabular-nums text-on-surface">{fmt(leads?.total ?? 0)}</p>
      {leads?.items.length ? (
        <ul className="mt-3 divide-y divide-outline-variant/60">
          {leads.items.map((l) => (
            <li key={l.id}>
              <Link href={`/contacts/${l.id}`} className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-surface-container-low">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body font-medium text-on-surface">{l.name || l.phone}</span>
                  <span className="block truncate text-caption text-on-surface-variant">
                    {l.origin} · {ago(l.createdAt)}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-caption text-on-surface-variant">No new leads yet today. Each one arrives as a parcel.</p>
      )}
      <Link
        href="/contacts"
        className="mt-4 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-outline-variant text-body text-on-surface hover:bg-surface-container-low"
      >
        All contacts <ArrowRight className="size-4" />
      </Link>
    </aside>
  );
}

/** Side panel: the clicked building's numbers, the dock's leads, or the whole city when nothing is picked. */
export function CityStatsPanel({
  data,
  leads,
  insights,
}: {
  data: LiveChannelStatsResponse;
  leads?: LiveLeadsResponse;
  insights?: CityInsightsResponse;
}) {
  const router = useRouter();
  const selected = useCityStore((s) => s.selected);
  const select = useCityStore((s) => s.select);
  const setChannelFilter = useInboxStore((s) => s.setChannelFilter);

  if (selected === "LEADS") return <LeadsPanel leads={leads} onClose={() => select(null)} />;

  const stat = selected ? data.channels.find((c) => c.key === selected) : undefined;

  const openChannel = (s: LiveChannelStat) => {
    if (s.key === "WEBSITE") return router.push("/inbox?channel=website");
    if (s.key === "EMAIL") return router.push("/campaigns");
    setChannelFilter(s.key);
    router.push("/inbox");
  };

  if (!stat) {
    const inbound = data.channels.reduce((n, c) => n + c.inbound, 0);
    const outbound = data.channels.reduce((n, c) => n + c.outbound, 0);
    const failed = data.channels.reduce((n, c) => n + c.failed, 0);
    return (
      <aside data-tour="city-panel" className="rounded-xl bg-surface-container-lowest p-5">
        <p className="text-label text-on-surface-variant">All channels · today</p>
        <p className="mt-1 text-display font-semibold tabular-nums text-on-surface">{fmt(inbound + outbound)}</p>
        <dl className="mt-3 divide-y divide-outline-variant/60">
          <Row label="Received" value={inbound} />
          <Row label="Sent" value={outbound} />
          <Row label="Failed" value={failed} tone="error" />
          <Row label="Open chats" value={data.openConversations} />
          <Row label="Unread" value={data.unread} />
        </dl>
        <p className="mt-4 text-caption text-on-surface-variant">Click a building to see its numbers.</p>
      </aside>
    );
  }

  const cfg = channelConfig(stat.key);
  const insight = insights?.channels.find((c) => c.key === stat.key);
  const level = replyLevel(insight?.replyMinutes);
  const currentHour = insights?.currentHour ?? new Date().getHours();
  return (
    <aside data-tour="city-panel" className="rounded-xl bg-surface-container-lowest p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: `var(${cfg.colorVar})` }} aria-hidden />
          <p className="text-title font-semibold text-on-surface">{cfg.label}</p>
        </div>
        <button
          type="button"
          onClick={() => select(null)}
          className="rounded-md p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
          aria-label="Back to all channels"
        >
          <X className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-display font-semibold tabular-nums text-on-surface">{fmt(totalOf(stat))}</p>
      <p className="text-caption text-on-surface-variant">{sinceLabel(stat.lastMessageAt)}</p>

      <dl className="mt-3 divide-y divide-outline-variant/60">
        {stat.key !== "EMAIL" && <Row label="Received" value={stat.inbound} />}
        <Row label="Sent" value={stat.outbound} />
        {stat.key !== "WEBSITE" && <Row label="Failed" value={stat.failed} tone="error" />}
        {stat.key !== "EMAIL" && (
          <div className="flex items-baseline justify-between py-2">
            <dt className="text-body text-on-surface-variant">Avg first reply</dt>
            <dd className="flex items-center gap-1.5 text-body font-medium tabular-nums text-on-surface">
              <span className={`size-2 rounded-full ${LEVEL_DOT[level]}`} aria-hidden />
              {insight?.replyMinutes != null ? formatMinutes(insight.replyMinutes) : "—"}
              <span className="font-normal text-on-surface-variant">{REPLY_WORD[level]}</span>
            </dd>
          </div>
        )}
      </dl>

      {insight && (
        <HourlyChart insight={insight} color={`var(${cfg.colorVar})`} currentHour={currentHour} label={cfg.label} />
      )}
      {stat.key !== "WEBSITE" && (
        <DeliveryFunnel
          sent={stat.outbound}
          delivered={stat.delivered}
          read={stat.read}
          color={`var(${cfg.colorVar})`}
          showRead={stat.key !== "EMAIL"}
        />
      )}
      <Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => openChannel(stat)}>
        {stat.key === "EMAIL" ? "Open campaigns" : "Open in inbox"}
        <ArrowRight className="size-4" />
      </Button>
    </aside>
  );
}
