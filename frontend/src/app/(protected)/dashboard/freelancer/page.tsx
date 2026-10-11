"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useOrgSettings } from "@/hooks/use-settings";
import { useContacts } from "@/hooks/use-contacts";
import { useConversations } from "@/hooks/use-conversations";
import { useFollowUps, useSetFollowUp } from "@/hooks/use-deals";
import { formatFollowUp } from "@/components/deals/contact-deal-card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Send,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Megaphone,
  Repeat,
  Filter,
  Zap,
  AlarmClock,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Layout from the Stitch "Wazelo — Ember Glass Theme" screen. Surfaces use the shared
// tokens, so they render as glass in the Glass theme and as plain cards elsewhere.
const CARD = "rounded-3xl border border-outline-variant bg-surface-container-lowest";

function Kpi({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex min-w-0 items-center gap-3 rounded-2xl p-3 transition-colors hover:bg-surface-container-low"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-full border border-outline-variant bg-surface-container-low text-primary-container">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-label text-on-surface-variant">{label}</span>
        <span className="block text-headline font-semibold tabular-nums text-on-surface">{value}</span>
      </span>
    </Link>
  );
}

function PipelineBar({
  label,
  count,
  max,
  total,
  shade,
}: {
  label: string;
  count: number;
  max: number;
  total: number;
  /** Opacity step of the accent, so stages read as one family */
  shade: string;
}) {
  const width = max === 0 ? 0 : (count / max) * 100;
  const share = total === 0 ? 0 : Math.round((count / total) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-body">
        <span className="flex items-center gap-2 text-on-surface">
          <span className={cn("size-2 rounded-full bg-primary-container", shade)} aria-hidden />
          {label}
        </span>
        <span className="tabular-nums text-on-surface">
          <span className="font-semibold">{count}</span>
          <span className="ml-1 text-label text-on-surface-variant">({share}%)</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-container">
        <div
          className={cn("h-2 rounded-full bg-primary-container transition-[width] duration-500 ease-standard", shade)}
          style={{ width: count === 0 ? "0.5rem" : `${width}%` }}
        />
      </div>
    </div>
  );
}

/** "5m", "3h", "2d" — how long a chat has been waiting */
function formatWaiting(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

function QuickAction({
  href,
  icon,
  label,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2.5 rounded-2xl border border-outline-variant bg-surface-container-low p-4 text-center transition-colors hover:border-primary-container/60 hover:bg-primary/8"
    >
      <span className="grid size-11 place-items-center rounded-full bg-primary/15 text-primary-container">{icon}</span>
      <span>
        <span className="block text-body font-semibold text-on-surface">{label}</span>
        <span className="block text-caption font-normal text-on-surface-variant">{hint}</span>
      </span>
    </Link>
  );
}

export default function FreelancerDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: orgSettings } = useOrgSettings();
  // Org settings are fresher than the token's copy (the type can change after login)
  const orgType = orgSettings?.orgType ?? user?.orgType;

  // Guard: redirect non-freelancers to the main dashboard
  useEffect(() => {
    if (orgType && orgType !== "FREELANCER") router.replace("/dashboard");
  }, [orgType, router]);

  // Pipeline counts per lead status
  const { data: newData }       = useContacts({ leadStatus: "NEW",        take: 1 });
  const { data: contactedData } = useContacts({ leadStatus: "CONTACTED",  take: 1 });
  const { data: interestedData } = useContacts({ leadStatus: "INTERESTED", take: 1 });
  const { data: convertedData } = useContacts({ leadStatus: "CONVERTED",  take: 1 });
  const { data: closedData }    = useContacts({ leadStatus: "CLOSED",     take: 1 });

  const stages = [
    { label: "New",        count: newData?.total ?? 0,        shade: "opacity-100" },
    { label: "Contacted",  count: contactedData?.total ?? 0,  shade: "opacity-85" },
    { label: "Interested", count: interestedData?.total ?? 0, shade: "opacity-70" },
    { label: "Converted",  count: convertedData?.total ?? 0,  shade: "opacity-55" },
    { label: "Closed",     count: closedData?.total ?? 0,     shade: "opacity-40" },
  ];
  const totalLeads = stages.reduce((sum, s) => sum + s.count, 0);
  const maxStage = Math.max(...stages.map((s) => s.count));
  const interestedCount = stages[2].count;
  // CONVERTED is the won status; CLOSED means the lead was closed without a deal
  const wonCount = stages[3].count;

  const { data: openConversations } = useConversations({ status: "OPEN", limit: 20 });
  const { data: followUps } = useFollowUps("due");
  const setFollowUp = useSetFollowUp();
  const awaitingReply = (openConversations?.data ?? [])
    .filter((c) => c.unreadCount > 0)
    .slice(0, 5);

  const firstName = user?.firstName ?? "there";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 pb-10 pt-4 lg:px-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display font-semibold text-on-surface">Hey, {firstName}</h1>
          <p className="mt-1 text-body-lg text-on-surface-variant">Your client pipeline overview</p>
        </div>
        <Link
          href="/contacts?action=new"
          className="flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-body-lg font-semibold text-on-primary shadow-[0_0_24px_-6px_var(--primary-glow)] transition-transform active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        {/* Main column */}
        <div className="min-w-0 space-y-6">
          {/* KPI strip */}
          <div className={cn(CARD, "stagger grid grid-cols-2 gap-1 p-2 md:grid-cols-4 md:divide-x md:divide-outline-variant")}>
            <Kpi label="Total Leads" value={totalLeads} icon={<Users className="h-5 w-5" />} href="/contacts" />
            <Kpi
              label="Open Conversations"
              value={openConversations ? openConversations.total : "…"}
              icon={<MessageSquare className="h-5 w-5" />}
              href="/inbox"
            />
            <Kpi label="Interested" value={interestedCount} icon={<Send className="h-5 w-5" />} href="/leads/pipeline" />
            <Kpi label="Clients Won" value={wonCount} icon={<CheckCircle2 className="h-5 w-5" />} href="/leads/pipeline" />
          </div>

          {/* Client Pipeline */}
          <section className={cn(CARD, "p-6")}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-title-sm font-semibold text-on-surface">
                <Filter className="h-5 w-5 text-primary-container" />
                Client Pipeline
              </h2>
              <Link
                href="/contacts"
                className="flex items-center gap-1 text-label font-medium text-primary-container hover:underline"
              >
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="stagger space-y-5">
              {stages.map((s) => (
                <PipelineBar key={s.label} {...s} max={maxStage} total={totalLeads} />
              ))}
            </div>
          </section>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <section className={cn(CARD, "p-5")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-title-sm font-semibold text-on-surface">Quick Actions</h2>
              <Zap className="h-4 w-4 text-primary-container" aria-hidden />
            </div>
            <div className="stagger grid grid-cols-2 gap-3">
              <QuickAction href="/contacts?action=new" icon={<Users className="h-5 w-5" />} label="Add Lead" hint="Into your CRM" />
              <QuickAction href="/inbox" icon={<MessageSquare className="h-5 w-5" />} label="Open Inbox" hint="WhatsApp chats" />
              <QuickAction href="/campaigns/create" icon={<Megaphone className="h-5 w-5" />} label="New Campaign" hint="Broadcast" />
              <QuickAction href="/sequences" icon={<Repeat className="h-5 w-5" />} label="Sequence" hint="Auto follow-ups" />
            </div>
          </section>

          <section className={cn(CARD, "p-5")}>
            <h2 className="mb-3 flex items-center gap-2 text-title-sm font-semibold text-on-surface">
              <AlarmClock className="h-4 w-4 text-primary-container" />
              Follow-ups due
            </h2>
            {!followUps || followUps.length === 0 ? (
              <p className="text-body text-on-surface-variant">
                Nothing due today. Set follow-ups from a chat&apos;s Deal card.
              </p>
            ) : (
              <ul className="space-y-1">
                {followUps.slice(0, 5).map((f) => {
                  const due = formatFollowUp(f.nextFollowUpAt);
                  return (
                    <li key={f.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-on-surface">
                          {f.contact.name || f.contact.phoneNumber}
                        </span>
                        <span className="block truncate text-label text-on-surface-variant">
                          {f.followUpNote || `${f.title} · ${f.stage.name}`}
                        </span>
                      </span>
                      <span className={cn("shrink-0 text-caption", due.overdue ? "text-error" : "text-on-surface-variant")}>
                        {due.text}
                      </span>
                      <button
                        type="button"
                        title="Mark done"
                        disabled={setFollowUp.isPending}
                        onClick={() => setFollowUp.mutate({ pipelineId: f.pipelineId, dealId: f.id, nextFollowUpAt: null })}
                        className="grid size-7 shrink-0 place-items-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-success hover:text-success"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <Link
              href="/deals"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 text-body font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Open deals <ArrowRight className="h-4 w-4" />
            </Link>
          </section>

          <section className={cn(CARD, "p-5")}>
            <h2 className="mb-3 flex items-center gap-2 text-title-sm font-semibold text-on-surface">
              <Clock className="h-4 w-4 text-primary-container" />
              Waiting for your reply
            </h2>
            {awaitingReply.length === 0 ? (
              <p className="text-body text-on-surface-variant">
                You&apos;re all caught up — no unread chats.
              </p>
            ) : (
              <ul className="space-y-1">
                {awaitingReply.map((c) => (
                  <li key={c.id}>
                    <Link
                      href="/inbox"
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-surface-container-low"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body font-medium text-on-surface">
                          {c.contactName || c.contactPhone}
                        </span>
                        <span className="block truncate text-label text-on-surface-variant">
                          {c.lastMessageBody || "New message"}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        {c.lastMessageAt && (
                          <span className="block text-caption text-on-surface-variant">
                            {formatWaiting(c.lastMessageAt)}
                          </span>
                        )}
                        <span className="mt-0.5 inline-grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption font-semibold tabular-nums text-on-primary">
                          {c.unreadCount}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <Link
              href="/inbox"
              className="mt-4 flex items-center justify-center gap-1.5 rounded-2xl border border-outline-variant bg-surface-container-low py-2.5 text-body font-medium text-on-surface transition-colors hover:bg-surface-container"
            >
              Open inbox <ArrowRight className="h-4 w-4" />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
