"use client";

import { Users, CheckCircle2, LogOut, MessageSquare, Clock } from "lucide-react";
import { useSequenceAnalytics } from "@/hooks/use-sequences";
import { Spinner } from "@/components/ui/spinner";

interface SequenceAnalyticsProps {
  sequenceId: string;
  onClose: () => void;
}

export function SequenceAnalytics({ sequenceId, onClose }: SequenceAnalyticsProps) {
  const { data, isLoading } = useSequenceAnalytics(sequenceId);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-[12px] text-on-surface-variant/50 py-4">No analytics data available.</p>;

  const maxReached = Math.max(...data.stepFunnel.map((s) => s.reached), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Enrolled" value={data.totalRecipients} color="text-primary" />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completedCount} color="text-green-500" />
        <StatCard icon={LogOut} label="Exited" value={data.exitedCount} color="text-orange-500" />
        <StatCard icon={MessageSquare} label="Reply Rate" value={`${data.replyRate}%`} color="text-blue-500" />
      </div>

      {/* Avg Completion Time */}
      {data.avgCompletionHours !== null && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/10">
          <Clock className="h-4 w-4 text-on-surface-variant/50" />
          <span className="text-[12px] text-on-surface-variant">Avg. completion time:</span>
          <span className="text-[13px] font-medium text-on-surface">
            {data.avgCompletionHours < 24
              ? `${data.avgCompletionHours}h`
              : `${Math.round(data.avgCompletionHours / 24 * 10) / 10} days`}
          </span>
        </div>
      )}

      {/* Step Funnel */}
      {data.stepFunnel.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-on-surface-variant/60 uppercase tracking-wide mb-3">Step Funnel</h3>
          <div className="space-y-2">
            {data.stepFunnel.map((step) => (
              <div key={step.stepOrder} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-on-surface-variant">{step.name}</span>
                  <span className="text-on-surface font-medium">{step.reached}</span>
                </div>
                <div className="h-2 rounded-full bg-surface-container overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${(step.reached / maxReached) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exit Reasons */}
      {data.exitReasons.length > 0 && (
        <div>
          <h3 className="text-[12px] font-medium text-on-surface-variant/60 uppercase tracking-wide mb-3">Exit Reasons</h3>
          <div className="space-y-1.5">
            {data.exitReasons.map((er) => (
              <div key={er.reason} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/10">
                <span className="text-[12px] text-on-surface-variant">{er.reason}</span>
                <span className="text-[13px] font-medium text-on-surface">{er.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Users;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="p-3 rounded-xl bg-surface-container border border-outline-variant/10 space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${color}`} />
        <span className="text-[10px] text-on-surface-variant/60 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-[20px] font-semibold text-on-surface">{value}</p>
    </div>
  );
}
