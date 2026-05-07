"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Tabs } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { LeadStatusBadge } from "./lead-status-badge";
import { useStatusHistory, useOwnerHistory } from "@/hooks/use-contacts";
import type { LeadStatus } from "@/lib/types/contacts";

interface ContactHistoryProps {
  contactId: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

const historyTabs = [
  { id: "status", label: "Status" },
  { id: "owner", label: "Owner" },
];

export function ContactHistory({ contactId }: ContactHistoryProps) {
  const [activeTab, setActiveTab] = useState("status");

  return (
    <div className="space-y-3">
      <Tabs tabs={historyTabs} activeTab={activeTab} onTabChange={setActiveTab} />
      {activeTab === "status" ? (
        <StatusTimeline contactId={contactId} />
      ) : (
        <OwnerTimeline contactId={contactId} />
      )}
    </div>
  );
}

function StatusTimeline({ contactId }: { contactId: string }) {
  const { data, isLoading } = useStatusHistory(contactId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-center text-[13px] text-on-surface-variant/50 py-4">
        No status changes
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant/30" />
      {data.map((entry) => (
        <div key={entry.id} className="relative flex gap-3 py-2">
          <div className="relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-surface-container-lowest shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {entry.previousStatus && (
                <>
                  <LeadStatusBadge status={entry.previousStatus as LeadStatus} />
                  <ArrowRight className="h-3 w-3 text-on-surface-variant/50" />
                </>
              )}
              <LeadStatusBadge status={entry.newStatus as LeadStatus} />
            </div>
            {entry.reason && (
              <p className="mt-1 text-[12px] text-on-surface-variant">
                {entry.reason}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-on-surface-variant/50">
              {timeAgo(entry.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

function OwnerTimeline({ contactId }: { contactId: string }) {
  const { data, isLoading } = useOwnerHistory(contactId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="text-center text-[13px] text-on-surface-variant/50 py-4">
        No owner changes
      </p>
    );
  }

  return (
    <div className="relative space-y-0">
      <div className="absolute left-[7px] top-2 bottom-2 w-px bg-outline-variant/30" />
      {data.map((entry) => (
        <div key={entry.id} className="relative flex gap-3 py-2">
          <div className="relative z-10 mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-primary bg-surface-container-lowest shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-on-surface">
              {entry.previousOwnerId ? "Reassigned" : "Assigned"}
            </p>
            {entry.reason && (
              <p className="mt-0.5 text-[12px] text-on-surface-variant">
                {entry.reason}
              </p>
            )}
            <p className="mt-0.5 text-[11px] text-on-surface-variant/50">
              {timeAgo(entry.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
