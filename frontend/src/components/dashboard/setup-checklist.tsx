"use client";

import Link from "next/link";
import {
  X,
  ArrowRight,
  Smartphone,
  Package,
  FileText,
  Contact,
  type LucideIcon,
} from "lucide-react";
import { useSetupChecklist, type ChecklistItem } from "@/hooks/use-setup-checklist";

const ITEM_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  whatsapp: { icon: Smartphone, color: "text-emerald-500", bg: "bg-emerald-500/10" },


  products:  { icon: Package,    color: "text-orange-500", bg: "bg-orange-500/10" },
  template:  { icon: FileText,   color: "text-primary",    bg: "bg-primary/10"    },
  contacts:  { icon: Contact,    color: "text-pink-500",   bg: "bg-pink-500/10"   },
};

/* ── SVG circular progress ring ─────────────────── */
function ProgressRing({ pct }: { pct: number }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return (
    <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
      <circle cx="68" cy="68" r={r} fill="none" stroke="var(--outline-variant)" strokeWidth="8" strokeOpacity="0.2" />
      <circle
        cx="68" cy="68" r={r}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        className="transition-all duration-700"
      />
    </svg>
  );
}

/* ── Single pending task row ─────────────────────── */
function TaskRow({ item }: { item: ChecklistItem }) {
  const meta = ITEM_META[item.id] ?? { icon: ArrowRight, color: "text-primary", bg: "bg-primary/10" };
  const Icon = meta.icon;

  return (
    <Link
      href={item.href}
      className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-surface-container-high transition-colors group"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${meta.bg} shrink-0`}>
        <Icon className={`h-4.5 w-4.5 ${meta.color}`} />
      </div>
      <span className="flex-1 text-[13px] font-medium text-on-surface truncate">
        {item.label}
      </span>
      <ArrowRight className="h-4 w-4 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
    </Link>
  );
}

/* ── Main component ──────────────────────────────── */
export function SetupChecklist() {
  const { items, doneCount, total, visible, dismiss } = useSetupChecklist();

  if (!visible) return null;

  const pending = items.filter((i) => !i.done);
  const pct = Math.round((doneCount / total) * 100);

  return (
    <div className="relative rounded-xl border border-outline-variant/10 bg-surface-container-lowest overflow-hidden">
      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute right-3 top-3 z-10 p-1 rounded-md text-on-surface-variant/40 hover:text-on-surface-variant hover:bg-surface-container-high transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex">
        {/* ── Left: ring + stats ───────────────────── */}
        <div className="flex flex-col items-center justify-center gap-3 px-8 py-6 border-r border-outline-variant/10 shrink-0 min-w-[192px]">
          <div className="relative flex items-center justify-center">
            <ProgressRing pct={pct} />
            <div className="absolute flex flex-col items-center">
              <span className="text-[28px] font-bold text-on-surface tabular-nums leading-none">
                {pct}%
              </span>
              <span className="text-[11px] text-on-surface-variant/50 mt-1">
                complete
              </span>
            </div>
          </div>
          <p className="text-[12px] text-on-surface-variant/60 text-center leading-snug">
            {doneCount} of {total} steps done
          </p>
        </div>

        {/* ── Right: title + pending tasks ─────────── */}
        <div className="flex-1 min-w-0 py-5">
          <div className="px-5 mb-4">
            <p className="text-[15px] font-semibold text-on-surface">
              Complete your setup
            </p>
            <p className="text-[12px] text-on-surface-variant/50 mt-1">
              Finish these steps to get the most out of Wazelo
            </p>
          </div>
          <div className="px-3 space-y-1">
            {pending.map((item) => (
              <TaskRow key={item.id} item={item} />
            ))}
            {pending.length === 0 && (
              <p className="px-4 text-[13px] text-on-surface-variant/50">
                All done! 🎉
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
