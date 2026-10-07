"use client";

import { Users, CheckCircle2, LogOut, MessageSquare, Clock, Activity } from "lucide-react";
import { useSequenceAnalytics, useSequenceRecipients } from "@/hooks/use-sequences";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import type { SequenceRecipientStatus } from "@/lib/types/sequences";

interface SequenceAnalyticsProps {
  sequenceId: string;
  onClose: () => void;
}

const RECIPIENT_STATUS_VARIANTS: Record<SequenceRecipientStatus, "success" | "info" | "warning" | "error"> = {
  ACTIVE: "success",
  COMPLETED: "info",
  EXITED: "warning",
  PAUSED: "error",
};

export function SequenceAnalytics({ sequenceId, onClose }: SequenceAnalyticsProps) {
  const { data, isLoading } = useSequenceAnalytics(sequenceId);
  const { data: recipientsData, isLoading: recipientsLoading } = useSequenceRecipients(sequenceId);

  if (isLoading) return <div className="flex justify-center py-8"><Spinner size="lg" /></div>;
  if (!data) return <p className="text-label text-on-surface-variant/50 py-4">No analytics data available.</p>;

  const maxReached = Math.max(...data.stepFunnel.map((s) => s.reached), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={Users} label="Total Recipients" value={data.totalRecipients} color="text-primary" />
        <StatCard icon={Activity} label="Active" value={data.activeCount} color="text-success" />
        <StatCard icon={CheckCircle2} label="Completed" value={data.completedCount} color="text-info" />
        <StatCard icon={LogOut} label="Exited" value={data.exitedCount} color="text-warning" />
      </div>

      {/* Reply Rate + Avg Completion Time */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/10">
          <MessageSquare className="h-4 w-4 text-info" />
          <span className="text-label text-on-surface-variant">Reply rate:</span>
          <span className="text-body font-medium text-on-surface">{data.replyRate}%</span>
        </div>
        {data.avgCompletionHours !== null && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-surface-container border border-outline-variant/10">
            <Clock className="h-4 w-4 text-on-surface-variant/50" />
            <span className="text-label text-on-surface-variant">Avg. completion time:</span>
            <span className="text-body font-medium text-on-surface">
              {data.avgCompletionHours < 24
                ? `${data.avgCompletionHours}h`
                : `${Math.round((data.avgCompletionHours / 24) * 10) / 10} days`}
            </span>
          </div>
        )}
      </div>

      {/* Step Funnel */}
      {data.stepFunnel.length > 0 && (
        <div>
          <h3 className="text-label font-medium text-on-surface-variant/60 uppercase tracking-wide mb-3">Step Funnel</h3>
          <div className="space-y-2">
            {data.stepFunnel.map((step) => (
              <div key={step.stepOrder} className="space-y-1">
                <div className="flex items-center justify-between text-label">
                  <span className="text-on-surface-variant">
                    <span className="font-medium text-on-surface/70 mr-1.5">Step {step.stepOrder + 1}</span>
                    {step.name || `Step ${step.stepOrder + 1}`}
                  </span>
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
          <h3 className="text-label font-medium text-on-surface-variant/60 uppercase tracking-wide mb-3">Exit Reasons</h3>
          <div className="space-y-1.5">
            {data.exitReasons.map((er) => (
              <div key={er.reason} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/10">
                <span className="text-label text-on-surface-variant">{er.reason}</span>
                <span className="text-body font-medium text-on-surface">{er.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipients Table */}
      <div>
        <h3 className="text-label font-medium text-on-surface-variant/60 uppercase tracking-wide mb-3">Recipients</h3>
        {recipientsLoading ? (
          <div className="flex justify-center py-6"><Spinner size="sm" /></div>
        ) : !recipientsData || recipientsData.data.length === 0 ? (
          <p className="text-label text-on-surface-variant/50 py-4 text-center">No recipients enrolled yet.</p>
        ) : (
          <div className="rounded-xl border border-outline-variant/15 overflow-hidden">
            <table className="table-auto w-full">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/15">
                  <th className="text-left px-4 py-2.5 text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">Contact</th>
                  <th className="text-left px-4 py-2.5 text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">Current Step</th>
                  <th className="text-left px-4 py-2.5 text-caption font-medium text-on-surface-variant/60 uppercase tracking-wide">Enrolled</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10">
                {recipientsData.data.map((r) => (
                  <tr key={r.id} className="hover:bg-surface-container/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <p className="text-body font-medium text-on-surface">
                        {r.contact.name || r.contact.phoneNumber}
                      </p>
                      {r.contact.name && (
                        <p className="text-caption text-on-surface-variant/60">{r.contact.phoneNumber}</p>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <Badge variant={RECIPIENT_STATUS_VARIANTS[r.status]}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-label text-on-surface-variant">
                      Step {r.currentStep + 1}
                    </td>
                    <td className="px-4 py-2.5 text-caption text-on-surface-variant">
                      {new Date(r.enrolledAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
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
        <span className="text-caption text-on-surface-variant/60 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-title font-semibold text-on-surface">{value}</p>
    </div>
  );
}
