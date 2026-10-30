"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar } from "@/components/ui/filter-bar";
import { Tabs } from "@/components/ui/tabs";
import { SequenceTable } from "@/components/sequences/sequence-table";
import { CreateSequenceModal } from "@/components/sequences/create-sequence-modal";
import {
  useSequences,
  useCreateSequence,
  useStartSequence,
  usePauseSequence,
  useResumeSequence,
  useCancelSequence,
  useDeleteSequence,
} from "@/hooks/use-sequences";
import { useWhatsAppSession } from "@/hooks/use-whatsapp";
import { usePageTitle } from "@/hooks/use-page-title";
import type { SequenceStatus } from "@/lib/types/sequences";
import { LoadError } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { WhatsAppRequiredBanner } from "@/components/whatsapp/whatsapp-required-banner";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";

const STATUS_TABS = [
  { id: "", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "ACTIVE", label: "Active" },
  { id: "PAUSED", label: "Paused" },
  { id: "COMPLETED", label: "Completed" },
];

export default function SequencesPage() {
  usePageTitle("Sequences");

  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
  const take = 20;

  const { data: session } = useWhatsAppSession();
  const { data, isLoading, isError, refetch } = useSequences({
    status: (statusFilter || undefined) as SequenceStatus | undefined,
    take,
    skip: page * take,
  });

  const createSequence = useCreateSequence();
  const startSequence = useStartSequence();
  const pauseSequence = usePauseSequence();
  const resumeSequence = useResumeSequence();
  const cancelSequence = useCancelSequence();
  const deleteSequence = useDeleteSequence();
  const router = useRouter();
  // Each sequence has its own details page (messages, settings, analytics, recipients)
  const openSequence = (id: string) => router.push(`/sequences/${id}`);

  return (
    <div className="space-y-4 lg:p-6 max-lg:px-4 max-lg:pt-2">
      <MobilePageActions primary={{ label: "New sequence", onClick: () => setShowCreate(true) }} />

      {/* Header: on mobile the nav bar has the title and "+" */}
      <PageHeader
        className="max-lg:hidden"
        title="Sequences"
        count={data?.total}
        description="A first message plus automatic follow-ups"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-1 h-4 w-4" /> New sequence
          </Button>
        }
      />

      <WhatsAppRequiredBanner action="send sequences" />

      <FilterBar className="mobile-scroll-x">
        <div data-tour="sequence-tabs">
          <Tabs
            tabs={STATUS_TABS}
            activeTab={statusFilter}
            onTabChange={(val) => {
              setStatusFilter(val);
              setPage(0);
            }}
          />
        </div>
      </FilterBar>

      {/* Content */}
      {/* Loading skeleton, empty state and pager all come from the shared table */}
      {isError ? (
        <LoadError what="sequences" onRetry={() => refetch()} />
      ) : (
        <SequenceTable
          sequences={data?.data ?? []}
          isLoading={isLoading}
          pagination={{ page, pageSize: take, total: data?.total ?? 0, onPageChange: setPage }}
          onStart={(id) => startSequence.mutate(id)}
          onPause={(id) => pauseSequence.mutate(id)}
          onResume={(id) => resumeSequence.mutate(id)}
          onCancel={(id) => cancelSequence.mutate(id)}
          // Deleting can't be undone, so it asks first
          onDelete={(id) => setPendingDelete(data?.data.find((s) => s.id === id) ?? { id, name: "this sequence" })}
          onCreateClick={() => setShowCreate(true)}
          onAnalytics={openSequence}
          onOpen={openSequence}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete sequence?"
        message={`"${pendingDelete?.name ?? ""}" and its message history will be removed. Contacts in it stop getting its messages. This can't be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteSequence.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          deleteSequence.mutate(pendingDelete.id, { onSettled: () => setPendingDelete(null) });
        }}
      />

      {/* Create modal */}
      <CreateSequenceModal
        open={showCreate}
        sessionId={session?.id ?? ""}
        onSubmit={(req) => {
          createSequence.mutate(req, {
            onSuccess: (created) => {
              setShowCreate(false);
              // Always-on sequences have nobody to send to yet — turn them on right away
              if (req.trigger) startSequence.mutate(created.id);
            },
          });
        }}
        onClose={() => setShowCreate(false)}
        submitting={createSequence.isPending || startSequence.isPending}
      />
    </div>
  );
}

