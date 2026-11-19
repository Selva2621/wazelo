"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, FileText, Globe, Megaphone, MessageSquare, Users } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StartHint } from "@/components/ui/start-hint";
import { cn } from "@/lib/utils";

export interface OverviewStat {
  label: string;
  value: number;
}

export interface OverviewChat {
  id: string;
  name: string;
  /** Phone or email under the name, when it differs */
  detail?: string | null;
  /** When the customer started waiting (ISO) */
  since: string;
}

interface InboxOverviewProps {
  /** Three counts for the tiles */
  stats: OverviewStat[];
  /** Customer waiting longest for a reply */
  oldest: OverviewChat | null;
  onOpen: (id: string) => void;
  /** No chats at all: show how to get the first one */
  empty?: boolean;
  /** Which inbox tab is showing, for the empty hint */
  channel?: "whatsapp" | "website";
  className?: string;
}

function waitedFor(iso: string): string {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

const SHORTCUTS: { href: string; label: string; icon: ReactNode }[] = [
  { href: "/settings/templates", label: "Templates", icon: <FileText className="h-4 w-4" /> },
  { href: "/campaigns?action=new", label: "New campaign", icon: <Megaphone className="h-4 w-4" /> },
  { href: "/contacts", label: "Contacts", icon: <Users className="h-4 w-4" /> },
];

const linkButton =
  "inline-flex h-8 items-center gap-2 rounded-lg border border-outline-variant px-3 text-body font-medium text-on-surface outline-none transition-colors hover:bg-surface-container-low focus-visible:ring-2 focus-visible:ring-focus";

/**
 * Desktop right pane when no chat is open: a quick read of the inbox and a way into the
 * chat that has waited longest.
 */
export function InboxOverview({ stats, oldest, onOpen, empty, channel = "whatsapp", className }: InboxOverviewProps) {
  return (
    <div data-tour="inbox-overview" className={cn("flex-1 overflow-y-auto", className)}>
      <div className="mx-auto w-full max-w-[720px] space-y-4 px-8 py-10">
        <h2 className="text-title font-semibold text-on-surface">Inbox overview</h2>

        {empty && (
          <StartHint
            icon={channel === "website" ? <Globe /> : <MessageSquare />}
            title="No chats yet"
            description={
              channel === "website"
                ? "Add the chat widget to your website to get visitor chats here."
                : "Connect WhatsApp or add the chat widget to start getting chats."
            }
            action={
              <>
                {channel === "whatsapp" && (
                  <Link href="/settings/whatsapp" className={linkButton}>
                    Connect WhatsApp
                  </Link>
                )}
                <Link href="/settings/chat-widget" className={linkButton}>
                  Chat widget
                </Link>
              </>
            }
          />
        )}

        {/* One card, three counts */}
        <dl className="grid grid-cols-3 divide-x divide-outline-variant rounded-2xl border border-outline-variant bg-surface-container-lowest">
          {stats.map((s) => (
            <div key={s.label} className="px-5 py-4">
              <dt className="text-label text-on-surface-variant">{s.label}</dt>
              <dd className="mt-1 text-headline font-semibold tabular-nums text-on-surface">{s.value}</dd>
            </div>
          ))}
        </dl>

        {oldest && (
          <section
            aria-labelledby="oldest-waiting"
            className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-2xl border border-outline-variant bg-surface-container-lowest px-5 py-4"
          >
            <Avatar name={oldest.name} size="md" />
            <div className="min-w-0 flex-1">
              <p id="oldest-waiting" className="text-label text-on-surface-variant">
                Oldest waiting · {waitedFor(oldest.since)}
              </p>
              <p className="truncate text-body font-semibold text-on-surface">{oldest.name}</p>
              {oldest.detail && oldest.detail !== oldest.name && (
                <p className="truncate text-label text-on-surface-variant">{oldest.detail}</p>
              )}
            </div>
            <Button size="sm" onClick={() => onOpen(oldest.id)}>
              Open chat
              <ArrowRight className="h-4 w-4" />
            </Button>
          </section>
        )}

        <nav aria-label="Shortcuts" className="flex flex-wrap gap-2 pt-2">
          {SHORTCUTS.map((s) => (
            <Link key={s.href} href={s.href} className={cn(linkButton, "text-on-surface-variant hover:text-on-surface")}>
              {s.icon}
              {s.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
