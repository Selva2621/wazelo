"use client";

import { useState } from "react";
import type { CityChannelInsight } from "@/lib/types/analytics";
import { hourLabel } from "./city-config";

const fmt = (n: number) => n.toLocaleString("en-IN");
const VB_W = 240;
const VB_H = 64;
const SLOT = VB_W / 24; // 10
const BAR = 7; // leaves a 3-unit gap between bars

/**
 * Messages per hour for one channel: today's bars in the channel colour,
 * yesterday as a faded bar behind each. Hover (or focus) a bar for its numbers.
 */
export function HourlyChart({
  insight,
  color,
  currentHour,
  label,
}: {
  insight: CityChannelInsight;
  color: string;
  currentHour: number;
  label: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const today = insight.today.map((b) => b.in + b.out);
  const yesterday = insight.yesterday.map((b) => b.in + b.out);
  const max = Math.max(1, ...today, ...yesterday);
  const h = (v: number) => (v / max) * (VB_H - 4);
  const busiest = today.reduce((best, v, i) => (v > today[best] ? i : best), 0);
  const shown = active ?? currentHour;

  return (
    <figure className="mt-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-label font-medium text-on-surface">Messages per hour</span>
        <span className="flex items-center gap-2 text-caption text-on-surface-variant">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-1.5 rounded-sm" style={{ background: color }} aria-hidden /> Today
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-1.5 rounded-sm bg-on-surface/20" aria-hidden /> Yesterday
          </span>
        </span>
      </figcaption>

      {/* Readout for the hovered hour (or now) */}
      <p className="mt-1 h-4 text-caption tabular-nums text-on-surface-variant" aria-live="polite">
        <span className="font-medium text-on-surface">{hourLabel(shown)}</span>
        {active === null && " (now)"} · {fmt(today[shown])} today ({fmt(insight.today[shown].in)} in /{" "}
        {fmt(insight.today[shown].out)} out) · {fmt(yesterday[shown])} yesterday
      </p>

      <svg
        viewBox={`0 0 ${VB_W} ${VB_H + 12}`}
        className="mt-1 w-full overflow-visible"
        role="img"
        aria-label={`${label} messages per hour today; busiest hour ${hourLabel(busiest)} with ${today[busiest]}`}
        onMouseLeave={() => setActive(null)}
      >
        {/* Baseline */}
        <line x1={0} x2={VB_W} y1={VB_H} y2={VB_H} className="stroke-outline-variant" strokeWidth={0.5} />
        {today.map((v, i) => {
          const x = i * SLOT + (SLOT - BAR) / 2;
          const yh = h(yesterday[i]);
          const th = h(v);
          const future = i > currentHour;
          return (
            <g key={i}>
              {/* Yesterday, faded */}
              {yesterday[i] > 0 && (
                <rect x={x} y={VB_H - yh} width={BAR} height={yh} rx={1.5} className="fill-on-surface/15" />
              )}
              {/* Today */}
              {!future && v > 0 && (
                <rect
                  x={x + 1}
                  y={VB_H - th}
                  width={BAR - 2}
                  height={th}
                  rx={1.5}
                  fill={color}
                  opacity={active === null || active === i ? 1 : 0.45}
                />
              )}
              {/* Hit target: the whole slot, taller than the bar */}
              <rect
                x={i * SLOT}
                y={0}
                width={SLOT}
                height={VB_H}
                fill="transparent"
                tabIndex={0}
                aria-label={`${hourLabel(i)}: ${v} today, ${yesterday[i]} yesterday`}
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                className="cursor-default outline-none"
              />
            </g>
          );
        })}
        {/* Now marker */}
        <circle cx={currentHour * SLOT + SLOT / 2} cy={VB_H + 3} r={1.6} fill={color} />
        {/* Hour ticks */}
        {[0, 6, 12, 18].map((t) => (
          <text
            key={t}
            x={t * SLOT + SLOT / 2}
            y={VB_H + 11}
            textAnchor="middle"
            className="fill-on-surface-variant"
            style={{ fontSize: 6.5 }}
          >
            {hourLabel(t).replace(" ", "")}
          </text>
        ))}
      </svg>
      {today[busiest] > 0 && (
        <p className="mt-1 text-caption text-on-surface-variant">
          Busiest hour today: <span className="font-medium text-on-surface">{hourLabel(busiest)}</span> ({fmt(today[busiest])})
        </p>
      )}
    </figure>
  );
}

/** Sent → delivered → read, as one-hue bars with plain numbers beside them */
export function DeliveryFunnel({
  sent,
  delivered,
  read,
  color,
  showRead,
}: {
  sent: number;
  delivered: number;
  read: number;
  color: string;
  showRead: boolean;
}) {
  const steps = [
    { label: "Sent", value: sent },
    { label: "Delivered", value: delivered },
    ...(showRead ? [{ label: "Read", value: read }] : []),
  ];
  return (
    <div className="mt-4">
      <p className="text-label font-medium text-on-surface">Delivery</p>
      <ul className="mt-2 space-y-1.5">
        {steps.map((s, i) => {
          const pct = sent ? Math.round((s.value / sent) * 100) : 0;
          return (
            <li key={s.label} className="grid grid-cols-[64px_1fr_auto] items-center gap-2 text-caption">
              <span className="text-on-surface-variant">{s.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-container-high">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${sent ? Math.max(pct, s.value ? 2 : 0) : 0}%`, background: color, opacity: 1 - i * 0.25 }}
                />
              </span>
              <span className="tabular-nums text-on-surface">
                {fmt(s.value)}
                {i > 0 && sent > 0 && <span className="text-on-surface-variant"> · {pct}%</span>}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
