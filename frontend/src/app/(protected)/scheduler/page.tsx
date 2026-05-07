"use client";

import { useState, useMemo } from "react";
import { Plus, Clock } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { useScheduledMessages, useCancelScheduledMessage } from "@/hooks/use-scheduler";
import { useAutomationSocket } from "@/hooks/use-automation-socket";
import { useSchedulerStore } from "@/stores/scheduler-store";
import { useWhatsAppSession } from "@/hooks/use-whatsapp";
import { SearchInput } from "@/components/ui/search-input";
import { Tabs } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScheduledMessagesTable } from "@/components/scheduler/scheduled-messages-table";
import { CreateScheduledMessageModal } from "@/components/scheduler/create-scheduled-message-modal";
import type {
  ScheduledMessageStatus,
  ListScheduledMessagesParams,
} from "@/lib/types/scheduler";

const TAKE = 20;

const STATUS_TABS: { id: string; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "QUEUED", label: "Queued" },
  { id: "SENT", label: "Sent" },
  { id: "FAILED", label: "Failed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default function SchedulerPage() {
  usePageTitle("Scheduler");
  useAutomationSocket();

  const [statusTab, setStatusTab] = useState("ALL");
  const {
    searchQuery,
    page,
    showCreateModal,
    setSearchQuery,
    setPage,
    setShowCreateModal,
  } = useSchedulerStore();

  const { data: session } = useWhatsAppSession();
  const cancelMessage = useCancelScheduledMessage();

  const effectiveStatus: ScheduledMessageStatus | undefined =
    statusTab !== "ALL" ? (statusTab as ScheduledMessageStatus) : undefined;

  const params = useMemo<ListScheduledMessagesParams>(
    () => ({
      limit: TAKE,
      offset: page * TAKE,
      status: effectiveStatus,
    }),
    [page, effectiveStatus],
  );

  const { data, isLoading } = useScheduledMessages(params);

  const tabsWithCounts = STATUS_TABS.map((tab) => ({
    ...tab,
    count: tab.id === "ALL" ? data?.total : undefined,
  }));

  function handleStatusTabChange(tabId: string) {
    setStatusTab(tabId);
    setPage(0);
  }

  function handleCancel(messageId: string) {
    cancelMessage.mutate(messageId);
  }

  const sessions = session
    ? [
        {
          id: session.id,
          name: session.phoneNumber || "WhatsApp Session",
          status: session.status,
        },
      ]
    : [];

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-on-surface-variant" />
            <h1 className="text-[18px] font-semibold text-on-surface">
              Scheduled Messages
            </h1>
            {data && (
              <span className="text-[13px] text-on-surface-variant/60">
                {data.total} total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages..."
              className="w-64"
            />
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Schedule Message
            </Button>
          </div>
        </div>

        {/* Status tabs */}
        <Tabs
          tabs={tabsWithCounts}
          activeTab={statusTab}
          onTabChange={handleStatusTabChange}
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <ScheduledMessagesTable
          messages={data?.data ?? []}
          total={data?.total ?? 0}
          take={TAKE}
          skip={page * TAKE}
          isLoading={isLoading}
          onCancel={handleCancel}
          isCancelling={cancelMessage.isPending}
          onPageChange={setPage}
          onCreateClick={() => setShowCreateModal(true)}
        />
      </div>

      {/* Create Modal */}
      <CreateScheduledMessageModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        sessions={sessions}
      />
    </div>
  );
}
