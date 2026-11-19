"use client";

import Link from "next/link";
import { Check, MessageCircle, Phone, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMarkLeadCalled, useMyLeads } from "@/hooks/use-lead-follow-ups";

/** "42m" / "1h 5m" since the lead came in */
function since(iso: string): string {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  return h < 24 ? `${h}h ${mins % 60}m` : `${Math.floor(h / 24)}d`;
}

/**
 * Leads given to me that nobody has contacted yet, late ones first.
 * Hidden when there are none. Messaging or changing the lead's status also clears it.
 */
export function LeadsWaitingCard() {
  const { data: leads } = useMyLeads();
  const called = useMarkLeadCalled();
  if (!leads?.length) return null;

  const sorted = [...leads].sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.assignedAt.localeCompare(b.assignedAt));
  const late = leads.filter((l) => l.overdue).length;

  return (
    <section className="rounded-2xl border border-outline-variant/15 bg-surface-container-lowest p-5 max-lg:p-4" data-tour="dash-leads-waiting">
      <div className="mb-3 flex items-baseline gap-2">
        <h2 className="text-title-sm font-semibold text-on-surface">Leads waiting for you</h2>
        <span className="text-body text-on-surface-variant">{leads.length}</span>
        {late > 0 && <span className="rounded-full bg-error/10 px-2 py-0.5 text-caption font-medium text-error">{late} late</span>}
      </div>
      <ul className="divide-y divide-outline-variant/10">
        {sorted.map((l) => (
          <li key={l.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 max-sm:flex-wrap">
            <div className="min-w-0 flex-1">
              <Link href={`/contacts/${l.contactId}`} className="text-body font-medium text-on-surface hover:underline">
                {l.contactName || l.contactPhone}
              </Link>
              <p className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                {l.productName && <span>{l.productName} ·</span>}
                <Timer className="h-3 w-3" aria-hidden />
                <span className={l.overdue ? "font-medium text-error" : undefined}>
                  {since(l.assignedAt)}{l.overdue ? " · late" : ""}
                </span>
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 max-sm:basis-full">
              <a
                href={`tel:${l.contactPhone}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 text-label text-on-surface hover:bg-surface-container"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden /> Call
              </a>
              <Link
                href={`/inbox?phone=${encodeURIComponent(l.contactPhone)}`}
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-outline-variant/30 px-2.5 text-label text-on-surface hover:bg-surface-container"
              >
                <MessageCircle className="h-3.5 w-3.5" aria-hidden /> WhatsApp
              </Link>
              <Button size="sm" variant="secondary" onClick={() => called.mutate(l.id)} loading={called.isPending && called.variables === l.id}>
                <Check className="h-3.5 w-3.5" aria-hidden /> Called
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
