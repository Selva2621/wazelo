"use client";

import { useAuthStore } from "@/stores/auth-store";
import { SetupChecklist } from "@/components/dashboard/setup-checklist";
import { useOrgSettings } from "@/hooks/use-settings";
import { useContacts } from "@/hooks/use-contacts";
import { useConversations } from "@/hooks/use-conversations";
import { useFollowUps, useSetFollowUp } from "@/hooks/use-deals";
import { useMessageVolume } from "@/hooks/use-analytics";
import { formatFollowUp } from "@/components/deals/contact-deal-card";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Link from "next/link";
import {
  Users,
  MessageSquare,
  Star,
  BadgeCheck,
  Plus,
  ArrowRight,
  ChevronRight,
  Megaphone,
  Repeat,
  AlarmClock,
  Check,
  ScanSearch,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";

// Bento layout from the Stitch "Wazelo - Bento Grid Layout" screen, built on the shared
// tokens so it follows the app's themes. One radius system: 24px cards, 16px tiles, pill buttons.
const CARD = "rounded-3xl border border-outline-variant bg-surface-container-lowest";
const TILE = "rounded-2xl border border-outline-variant/60 bg-surface-container-low/40";

const ACTION_CLASS =
  "inline-flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container-lowest px-4 py-2 text-body font-medium text-on-surface transition-colors hover:border-primary-container/60 hover:bg-primary/5 active:scale-[0.98]";

function CardHeader({ id, icon, title, aside }: { id: string; icon?: React.ReactNode; title: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 border-b border-outline-variant/40 pb-3">
      <h2 id={id} className="flex items-center gap-2 text-title-sm font-semibold text-on-surface">
        {icon}
        {title}
      </h2>
      {aside}
    </div>
  );
}

function Kpi({
  label,
  value,
  caption,
  icon,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  caption: string;
  icon: React.ReactNode;
  /** Icon tile colours, one per card so the strip scans at a glance */
  tone: string;
  href: string;
}) {
  return (
    // Phones: two tiles per row, icon above the numbers
    <Link href={href} className={cn(CARD, "group flex min-w-0 items-center gap-4 p-4 transition-colors hover:border-primary/40 max-sm:flex-col max-sm:items-start max-sm:gap-3 max-sm:rounded-2xl max-lg:active:scale-[0.98]")}>
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-2xl max-sm:size-10 max-sm:rounded-xl", tone)}>{icon}</span>
      <span className="min-w-0 max-sm:w-full">
        <span className="block truncate text-label text-on-surface-variant">{label}</span>
        <span className="flex items-baseline gap-2 max-sm:flex-col max-sm:items-start max-sm:gap-0">
          <span className="text-headline font-semibold tabular-nums text-on-surface">{value}</span>
          <span className="truncate text-caption text-on-surface-variant">{caption}</span>
        </span>
      </span>
    </Link>
  );
}

/** "5m", "3h", "2d": how long a chat has been waiting */
function formatWaiting(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

/** The everyday shortcuts; Add Lead stays in the greeting row */
function QuickActions({ className }: { className?: string }) {
  const actions = [
    { href: "/inbox", label: "Open inbox", icon: MessageSquare },
    { href: "/leads/scraper", label: "Find leads", icon: ScanSearch },
    { href: "/campaigns?action=new", label: "New campaign", icon: Megaphone },
    { href: "/sequences", label: "Sequence", icon: Repeat },
  ];
  return (
    <nav aria-label="Quick actions" className={className}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actions.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            // Phones/tablets: iOS tiles, icon above the label so it never truncates
            className={cn(CARD, "flex items-center gap-3 px-4 py-3 text-body font-semibold text-on-surface transition-colors hover:border-primary/40 hover:bg-primary/5 active:scale-[0.98] max-lg:flex-col max-lg:items-start max-lg:gap-2.5 max-lg:rounded-2xl max-lg:p-3.5")}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Icon className="h-4.5 w-4.5" />
            </span>
            <span className="truncate max-lg:w-full">{label}</span>
            <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-on-surface-variant/40 max-lg:hidden" />
          </Link>
        ))}
      </div>
    </nav>
  );
}

const WEEKDAY = new Intl.DateTimeFormat(undefined, { weekday: "narrow" });

/** Messages this week: totals and one bar per day, from the analytics API */
function ThisWeek() {
  const { data, isError } = useMessageVolume({ period: "week" });
  const series = data?.series ?? [];
  const totals = data?.totals;
  const peak = Math.max(1, ...series.map((d) => d.total));
  const todayKey = new Date().toDateString();
  const sent = totals?.outbound ?? 0;
  const replies = totals?.inbound ?? 0;
  const responseRate = sent > 0 ? Math.round((replies / sent) * 1000) / 10 : null;

  return (
    <section className={cn(CARD, "flex flex-col p-5")} aria-labelledby="week-title">
      <CardHeader id="week-title" icon={<BarChart3 className="h-4 w-4 text-primary" />} title="This week's activity" />
      {isError ? (
        <p className="text-body text-on-surface-variant">Activity isn&apos;t available right now.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "Sent messages", short: "Sent", value: sent },
              { label: "Replies", short: "Replies", value: replies },
              { label: "Read", short: "Read", value: totals?.read ?? 0 },
            ].map((s) => (
              <div key={s.label} className={cn(TILE, "px-3 py-2.5")}>
                {/* Phones: the short label fits a third of the card */}
                <p className="truncate text-caption text-on-surface-variant max-sm:hidden">{s.label}</p>
                <p className="truncate text-caption text-on-surface-variant sm:hidden">{s.short}</p>
                <p className="text-title-sm font-semibold tabular-nums text-on-surface">{data ? s.value : "…"}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex-1">
            <p className="mb-2 text-caption text-on-surface-variant">Messages per day</p>
            <div className="flex h-20 items-end gap-2" role="img" aria-label="Messages per day this week">
              {(series.length ? series : Array.from({ length: 7 }, (_, i) => ({ date: String(i), total: 0 }))).map((d) => {
                const isToday = series.length > 0 && new Date(d.date).toDateString() === todayKey;
                return (
                  <div key={d.date} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <div
                      className={cn("w-full rounded-md", isToday ? "bg-primary" : d.total ? "bg-primary/30" : "bg-surface-container")}
                      style={{ height: `${Math.max(8, (d.total / peak) * 100)}%` }}
                      title={`${d.total} messages`}
                    />
                    <span className={cn("text-caption", isToday ? "font-semibold text-primary" : "text-on-surface-variant")}>
                      {series.length ? WEEKDAY.format(new Date(d.date)) : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="mt-4 flex items-center gap-2 border-t border-outline-variant/40 pt-3 text-label text-on-surface-variant">
            Reply rate:{" "}
            <span className="font-semibold tabular-nums text-on-surface">{responseRate === null ? "n/a" : `${responseRate}%`}</span>
            {responseRate !== null && responseRate >= 25 && (
              <span className="ml-auto inline-flex items-center gap-1 text-success">
                <TrendingUp className="h-3.5 w-3.5" /> Good
              </span>
            )}
          </p>
        </>
      )}
    </section>
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
    { label: "New",        count: newData?.total ?? 0 },
    { label: "Contacted",  count: contactedData?.total ?? 0 },
    { label: "Interested", count: interestedData?.total ?? 0 },
    { label: "Converted",  count: convertedData?.total ?? 0 },
    { label: "Closed",     count: closedData?.total ?? 0 },
  ];
  const totalLeads = stages.reduce((sum, s) => sum + s.count, 0);
  const maxStage = Math.max(1, ...stages.map((s) => s.count));
  const interestedCount = stages[2].count;
  // CONVERTED is the won status; CLOSED means the lead was closed without a deal
  const wonCount = stages[3].count;
  const conversionRate = totalLeads === 0 ? 0 : Math.round((wonCount / totalLeads) * 1000) / 10;

  const { data: openConversations } = useConversations({ status: "OPEN", limit: 20 });
  const { data: followUps } = useFollowUps("due");
  const setFollowUp = useSetFollowUp();
  const awaitingReply = (openConversations?.data ?? []).filter((c) => c.unreadCount > 0).slice(0, 6);
  const dueFollowUps = (followUps ?? []).slice(0, 6);
  const needsYouCount = awaitingReply.length + dueFollowUps.length;
  const unreadChats = (openConversations?.data ?? []).filter((c) => c.unreadCount > 0).length;

  const firstName = user?.firstName ?? "there";

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 pb-10 pt-4 lg:px-6">
      {/* Phones/tablets: Add Lead is the nav bar's + button */}
      <MobilePageActions primary={{ label: "Add lead", onClick: () => router.push("/contacts?action=new") }} />

      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-display font-semibold text-on-surface max-lg:text-title">Hey, {firstName}</h1>
          <p className="mt-1 text-body-lg text-on-surface-variant max-lg:mt-0 max-lg:text-body">Your client pipeline overview</p>
        </div>
        <Link
          href="/contacts?action=new"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-body font-semibold text-on-primary shadow-[0_0_24px_-6px_var(--primary-glow)] transition-transform active:scale-[0.98] max-lg:hidden"
        >
          <Plus className="h-4 w-4" />
          Add Lead
        </Link>
      </div>

      {/* Row 1: everyday shortcuts */}
      <QuickActions />

      {/* Row 2: today's work + every setup step, one by one */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <section className={cn(CARD, "flex flex-col p-5")} aria-labelledby="needs-you-title">
          <CardHeader
            id="needs-you-title"
            title={
              <>
                Needs you today
                {needsYouCount > 0 && (
                  <span className="grid min-w-6 place-items-center rounded-full bg-primary/15 px-1.5 text-label font-semibold tabular-nums text-primary">
                    {needsYouCount}
                  </span>
                )}
              </>
            }
            aside={
              <Link href="/inbox" className="text-label font-medium text-on-surface-variant hover:text-primary">
                Open inbox
              </Link>
            }
          />

          {needsYouCount === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl bg-surface-container-low px-4 py-8 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-success/10 text-success">
                <Check className="h-6 w-6" />
              </span>
              <div>
                <p className="text-body-lg font-semibold text-on-surface">You&apos;re all caught up</p>
                <p className="text-label text-on-surface-variant">No unread chats and no follow-ups due.</p>
              </div>
              <Link href="/leads/scraper" className={ACTION_CLASS}>
                <ScanSearch className="h-4 w-4 text-primary-container" />
                Find new leads
              </Link>
            </div>
          ) : (
            <ul className="flex-1 space-y-2.5">
              {awaitingReply.map((c) => (
                <li key={`chat-${c.id}`}>
                  <Link
                    href="/inbox"
                    className={cn(TILE, "flex items-center gap-3 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5")}
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-success/10 text-success">
                      <MessageSquare className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-body-lg font-semibold text-on-surface">
                          {c.contactName || c.contactPhone}
                        </span>
                        <span className="shrink-0 rounded-full bg-success/10 px-2 py-0.5 text-caption font-medium text-success">
                          Incoming
                        </span>
                      </span>
                      {/* The chat's actual last message, exactly as it arrived */}
                      <span className="block truncate text-body text-on-surface-variant" title={c.lastMessageBody ?? undefined}>
                        {c.lastMessageBody || "New message"}
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {c.lastMessageAt && (
                        <span className="text-caption text-on-surface-variant">{formatWaiting(c.lastMessageAt)} ago</span>
                      )}
                      <span className="grid min-w-5 place-items-center rounded-full bg-primary px-1.5 text-caption font-semibold tabular-nums text-on-primary">
                        {c.unreadCount}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-on-surface-variant/50" />
                  </Link>
                </li>
              ))}
              {dueFollowUps.map((f) => {
                const due = formatFollowUp(f.nextFollowUpAt);
                return (
                  <li key={`follow-${f.id}`} className={cn(TILE, "flex items-center gap-3 p-3")}>
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-warning/10 text-warning">
                      <AlarmClock className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body-lg font-semibold text-on-surface">
                        {f.contact.name || f.contact.phoneNumber}
                      </span>
                      <span className="block truncate text-body text-on-surface-variant">
                        Follow up: {f.followUpNote || `${f.title}, ${f.stage.name}`}
                      </span>
                    </span>
                    <span className={cn("shrink-0 text-caption", due.overdue ? "text-error" : "text-on-surface-variant")}>
                      {due.text}
                    </span>
                    <button
                      type="button"
                      title="Mark done"
                      aria-label={`Mark follow-up with ${f.contact.name || f.contact.phoneNumber} done`}
                      disabled={setFollowUp.isPending}
                      onClick={() => setFollowUp.mutate({ pipelineId: f.pipelineId, dealId: f.id, nextFollowUpAt: null })}
                      className="grid size-9 shrink-0 place-items-center rounded-full border border-outline-variant text-on-surface-variant transition-colors hover:border-success hover:text-success"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-outline-variant/40 pt-3 text-label text-on-surface-variant">
            <span className={cn("size-2 rounded-full", dueFollowUps.length ? "bg-warning" : "bg-success")} aria-hidden />
            Follow-ups due:{" "}
            <span className="font-semibold text-on-surface">
              {dueFollowUps.length ? `${dueFollowUps.length} today` : "none today"}
            </span>
            <Link href="/deals" className="ml-1 font-semibold text-primary hover:underline">
              Open deals
            </Link>
          </div>
        </section>

        <SetupChecklist />
      </div>

      {/* Row 3: KPI tiles, the busier two wider */}
      <div className="stagger grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[2fr_2fr_1.5fr_1.5fr] max-sm:grid-cols-2">
        <Kpi
          label="Total Leads"
          value={totalLeads}
          caption="in your pipeline"
          icon={<Users className="h-5 w-5" />}
          tone="bg-primary/10 text-primary"
          href="/contacts"
        />
        <Kpi
          label="Open Conversations"
          value={openConversations ? openConversations.total : "…"}
          caption={unreadChats ? `${unreadChats} unread` : "all read"}
          icon={<MessageSquare className="h-5 w-5" />}
          tone="bg-chart-4/10 text-chart-4"
          href="/inbox"
        />
        <Kpi
          label="Interested"
          value={interestedCount}
          caption={interestedCount ? "ready for a proposal" : "none yet"}
          icon={<Star className="h-5 w-5" />}
          tone="bg-warning/10 text-warning"
          href="/leads/pipeline"
        />
        <Kpi
          label="Clients Won"
          value={wonCount}
          caption={`${conversionRate}% of leads`}
          icon={<BadgeCheck className="h-5 w-5" />}
          tone="bg-success/10 text-success"
          href="/leads/pipeline"
        />
      </div>

      {/* Row 4: activity + pipeline */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
        <ThisWeek />
        <section className={cn(CARD, "flex flex-col p-5")} aria-labelledby="pipeline-title">
          <CardHeader
            id="pipeline-title"
            title="Client pipeline"
            aside={
              <Link href="/leads/pipeline" className="flex items-center gap-1 text-label font-semibold text-primary hover:underline">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          <ul className="stagger flex-1 space-y-3">
            {stages.map((s) => (
              <li key={s.label}>
                <div className="flex items-center justify-between text-body">
                  <span className={s.count ? "font-medium text-on-surface" : "text-on-surface-variant"}>{s.label}</span>
                  <span className="font-semibold tabular-nums text-on-surface">{s.count}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-container">
                  <div
                    className="h-1.5 rounded-full bg-primary transition-[width] duration-500 ease-standard"
                    style={{ width: `${(s.count / maxStage) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex justify-between border-t border-outline-variant/40 pt-3 text-label text-on-surface-variant">
            Conversion rate <span className="font-semibold tabular-nums text-on-surface">{conversionRate}%</span>
          </p>
        </section>
      </div>
    </div>
  );
}
