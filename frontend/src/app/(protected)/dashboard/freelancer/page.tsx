"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useOrgSettings } from "@/hooks/use-settings";
import { useContacts } from "@/hooks/use-contacts";
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
  TrendingUp,
} from "lucide-react";

function StatCard({
  label,
  value,
  icon,
  href,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  href?: string;
}) {
  const inner = (
    <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-5 flex items-center gap-4 hover:border-outline transition-colors">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-on-surface">{value}</p>
        <p className="text-xs text-on-surface-variant">{label}</p>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function PipelineBar({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-on-surface-variant w-32 shrink-0">{label}</span>
      <div className="flex-1 bg-surface-container rounded-full h-2">
        <div
          className={`h-2 rounded-full ${color}`}
          style={{ width: count === 0 ? "4px" : `${Math.min(100, count * 10)}%` }}
        />
      </div>
      <span className="text-xs font-semibold text-on-surface w-6 text-right">{count}</span>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-outline-variant bg-surface-container-low hover:border-primary hover:bg-primary/5 transition-colors text-center"
    >
      <span className="text-primary">{icon}</span>
      <span className="text-xs font-medium text-on-surface">{label}</span>
    </Link>
  );
}

export default function FreelancerDashboard() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const { data: orgSettings, isLoading } = useOrgSettings();

  // Guard: redirect non-freelancers to the main dashboard
  useEffect(() => {
    if (isLoading) return;
    if (orgSettings?.orgType && orgSettings.orgType !== "FREELANCER") {
      router.replace("/dashboard");
    }
  }, [isLoading, orgSettings?.orgType, router]);

  // Pipeline counts per lead status
  const { data: inquiryData }  = useContacts({ leadStatus: "NEW",        take: 1 });
  const { data: discoveryData } = useContacts({ leadStatus: "CONTACTED",  take: 1 });
  const { data: proposalData }  = useContacts({ leadStatus: "QUALIFIED",  take: 1 });
  const { data: contractData }  = useContacts({ leadStatus: "NEGOTIATION", take: 1 });
  const { data: activeData }    = useContacts({ leadStatus: "CONVERTED",   take: 1 });
  const { data: completedData } = useContacts({ leadStatus: "CLOSED_WON",  take: 1 });

  const inquiryCount   = inquiryData?.total   ?? 0;
  const discoveryCount = discoveryData?.total  ?? 0;
  const proposalCount  = proposalData?.total   ?? 0;
  const contractCount  = contractData?.total   ?? 0;
  const activeCount    = activeData?.total     ?? 0;
  const completedCount = completedData?.total  ?? 0;
  const totalLeads = inquiryCount + discoveryCount + proposalCount + contractCount + activeCount + completedCount;

  const firstName = user?.firstName ?? "there";

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Hey, {firstName}
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            Your client pipeline overview
          </p>
        </div>
        <Link
          href="/contacts?action=new"
          className="flex items-center gap-2 rounded-xl bg-primary text-on-primary text-sm font-semibold px-4 py-2"
        >
          <Plus className="w-4 h-4" />
          Add Lead
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          label="Total Leads"
          value={totalLeads}
          icon={<Users className="w-5 h-5" />}
          href="/contacts"
        />
        <StatCard
          label="Open Conversations"
          value="—"
          icon={<MessageSquare className="w-5 h-5" />}
          href="/inbox"
        />
        <StatCard
          label="Proposals Sent"
          value={proposalCount}
          icon={<Send className="w-5 h-5" />}
          href="/contacts"
        />
        <StatCard
          label="Closed This Month"
          value={completedCount}
          icon={<CheckCircle2 className="w-5 h-5" />}
          href="/contacts"
        />
      </div>

      {/* Pipeline + Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-on-surface text-sm">Client Pipeline</h2>
            <Link
              href="/contacts"
              className="text-xs text-primary flex items-center gap-1 hover:underline"
            >
              View all <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            <PipelineBar label="Inquiry"           count={inquiryCount}   color="bg-blue-400" />
            <PipelineBar label="Discovery"         count={discoveryCount} color="bg-violet-400" />
            <PipelineBar label="Proposal Sent"     count={proposalCount}  color="bg-amber-400" />
            <PipelineBar label="Contract & Deposit" count={contractCount} color="bg-orange-400" />
            <PipelineBar label="Active Project"    count={activeCount}    color="bg-emerald-400" />
            <PipelineBar label="Completed"         count={completedCount} color="bg-green-500" />
          </div>
        </div>

        <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
          <h2 className="font-semibold text-on-surface text-sm mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              href="/contacts?action=new"
              icon={<Users className="w-5 h-5" />}
              label="Add Lead"
            />
            <QuickAction
              href="/inbox"
              icon={<MessageSquare className="w-5 h-5" />}
              label="Open Inbox"
            />
            <QuickAction
              href="/campaigns/create"
              icon={<Megaphone className="w-5 h-5" />}
              label="New Campaign"
            />
            <QuickAction
              href="/sequences"
              icon={<TrendingUp className="w-5 h-5" />}
              label="Follow-up Sequence"
            />
          </div>
        </div>
      </div>

      {/* Follow-ups due today */}
      <div className="bg-surface-container-low rounded-2xl border border-outline-variant p-6">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-on-surface-variant" />
          <h2 className="font-semibold text-on-surface text-sm">Follow-ups Due Today</h2>
        </div>
        <p className="text-sm text-on-surface-variant">
          No follow-ups scheduled for today.{" "}
          <Link href="/sequences" className="text-primary hover:underline">
            Set up a sequence
          </Link>{" "}
          to automate your outreach.
        </p>
      </div>
    </div>
  );
}
