"use client";

import { useState } from "react";
import Link from "next/link";
import {
  X,
  ArrowRight,
  Check,
  Smartphone,
  Package,
  FileText,
  Contact,
  MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSetupChecklist, type ChecklistItem } from "@/hooks/use-setup-checklist";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/whatsapp-connection-panel";

const ITEM_META: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  whatsapp: { icon: Smartphone, color: "text-success", bg: "bg-success/10" },
  products:  { icon: Package,    color: "text-warning", bg: "bg-warning/10" },
  template:  { icon: FileText,   color: "text-primary",    bg: "bg-primary/10"    },
  contacts:  { icon: Contact,    color: "text-chart-4",   bg: "bg-chart-4/10"   },
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

/* ── Single task row ─────────────────────────────── */
function TaskRow({ item, onConnectWhatsApp }: { item: ChecklistItem; onConnectWhatsApp: () => void }) {
  const meta = ITEM_META[item.id] ?? { icon: ArrowRight, color: "text-primary", bg: "bg-primary/10" };
  const Icon = meta.icon;

  const content = (
    <>
      <div
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-lg shrink-0",
          item.done ? "bg-success/10" : meta.bg,
        )}
      >
        {item.done ? <Check className="h-4.5 w-4.5 text-success" /> : <Icon className={`h-4.5 w-4.5 ${meta.color}`} />}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <p className={cn("text-body font-medium truncate", item.done ? "text-on-surface-variant line-through" : "text-on-surface")}>
          {item.label}
        </p>
        {!item.done && (
          <p className="text-label text-on-surface-variant truncate">{item.description}</p>
        )}
      </div>
      {!item.done && (
        <ArrowRight className="h-4 w-4 text-on-surface-variant/30 group-hover:text-primary transition-colors shrink-0" />
      )}
    </>
  );

  const rowClass = "flex w-full items-center gap-3 rounded-lg px-4 py-3 transition-colors group";

  if (item.done) {
    return <div className={rowClass}>{content}</div>;
  }
  if (item.action === "connect-whatsapp") {
    return (
      <button type="button" onClick={onConnectWhatsApp} className={cn(rowClass, "hover:bg-surface-container-high")}>
        {content}
      </button>
    );
  }
  return (
    <Link href={item.href} className={cn(rowClass, "hover:bg-surface-container-high")}>
      {content}
    </Link>
  );
}

/* ── Main component ──────────────────────────────── */
export function SetupChecklist() {
  const { items, doneCount, total, visible, dismiss } = useSetupChecklist();
  const [connectOpen, setConnectOpen] = useState(false);

  // Keep the modal mounted while open so the "connected" state can show
  // after the last step completes and the card would otherwise hide
  if (!visible && !connectOpen) return null;

  const pct = Math.round((doneCount / total) * 100);

  return (
    <>
      {visible && (
        <div className="relative rounded-xl bg-surface-container-lowest overflow-hidden">
          {/* Dismiss */}
          <IconButton size="xs"
            onClick={dismiss}
            aria-label="Dismiss"
            className="absolute right-3 top-3 z-10 hover:text-on-surface-variant"
          >
            <X className="h-3.5 w-3.5" />
          </IconButton>

          <div className="flex">
            {/* ── Left: ring + stats ───────────────────── */}
            <div className="hidden sm:flex flex-col items-center justify-center gap-3 px-8 py-6 border-r border-outline-variant/10 shrink-0 min-w-[192px]">
              <div className="relative flex items-center justify-center">
                <ProgressRing pct={pct} />
                <div className="absolute flex flex-col items-center">
                  <span className="text-display font-semibold text-on-surface tabular-nums leading-none">
                    {pct}%
                  </span>
                  <span className="text-caption text-on-surface-variant/50 mt-1">
                    complete
                  </span>
                </div>
              </div>
              <p className="text-label text-on-surface-variant/60 text-center leading-snug">
                {doneCount} of {total} steps done
              </p>
            </div>

            {/* ── Right: title + tasks ─────────────────── */}
            <div className="flex-1 min-w-0 py-5">
              <div className="px-5 mb-4">
                <p className="text-body-lg font-semibold text-on-surface">
                  Get set up
                </p>
                <p className="text-label text-on-surface-variant mt-1">
                  <span className="sm:hidden">{doneCount} of {total} done. </span>
                  Finish these steps to start messaging
                </p>
              </div>
              <div className="px-3 space-y-1">
                {items.map((item) => (
                  <TaskRow key={item.id} item={item} onConnectWhatsApp={() => setConnectOpen(true)} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <Modal
        open={connectOpen}
        onClose={() => setConnectOpen(false)}
        aria-labelledby="connect-whatsapp-title"
        className="max-w-[520px] p-6"
      >
        {() => (
          <>
            <div className="flex items-center gap-3 mb-6 pr-8">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#25D366]/15">
                <MessageCircle className="h-5 w-5 text-[#25D366]" />
              </div>
              <h2 id="connect-whatsapp-title" className="text-title font-semibold text-on-surface">
                Connect WhatsApp
              </h2>
            </div>
            <IconButton size="xs"
              onClick={() => setConnectOpen(false)}
              aria-label="Close"
              className="absolute right-4 top-4"
            >
              <X className="h-4 w-4" />
            </IconButton>
            <WhatsAppConnectionPanel compact />
          </>
        )}
      </Modal>
    </>
  );
}
