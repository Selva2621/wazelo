"use client";

import { useState } from "react";
import { Plus, Workflow, BarChart3, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Pagination } from "@/components/ui/pagination";
import { SequenceTable } from "@/components/sequences/sequence-table";
import { CreateSequenceModal } from "@/components/sequences/create-sequence-modal";
import { SequenceAnalytics } from "@/components/sequences/sequence-analytics";
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
  const [analyticsId, setAnalyticsId] = useState<string | null>(null);
  const take = 20;

  const { data: session } = useWhatsAppSession();
  const { data, isLoading } = useSequences({
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

  // Analytics view
  if (analyticsId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setAnalyticsId(null)} className="p-2 rounded-lg hover:bg-surface-container transition-colors">
            <ArrowLeft className="h-4 w-4 text-on-surface-variant" />
          </button>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Sequence Analytics
          </h1>
        </div>
        <SequenceAnalytics sequenceId={analyticsId} onClose={() => setAnalyticsId(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Workflow className="h-6 w-6 text-primary" />
            Drip Sequences
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Multi-step automated message sequences
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="h-4 w-4 mr-1" /> New Sequence
        </Button>
      </div>

      {/* Status tabs */}
      <Tabs
        tabs={STATUS_TABS}
        activeTab={statusFilter}
        onTabChange={(val) => {
          setStatusFilter(val);
          setPage(0);
        }}
      />

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : (
        <>
          <SequenceTable
            sequences={data?.data ?? []}
            onStart={(id) => startSequence.mutate(id)}
            onPause={(id) => pauseSequence.mutate(id)}
            onResume={(id) => resumeSequence.mutate(id)}
            onCancel={(id) => cancelSequence.mutate(id)}
            onDelete={(id) => deleteSequence.mutate(id)}
            onCreateClick={() => setShowCreate(true)}
            onAnalytics={(id) => setAnalyticsId(id)}
          />

          {(data?.total ?? 0) > take && (
            <Pagination
              total={data?.total ?? 0}
              totalPages={Math.ceil((data?.total ?? 0) / take)}
              page={page}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateSequenceModal
          sessionId={session?.id ?? ""}
          onSubmit={(req) => {
            createSequence.mutate(req, {
              onSuccess: () => setShowCreate(false),
            });
          }}
          onClose={() => setShowCreate(false)}
          submitting={createSequence.isPending}
        />
      )}
    </div>
  );
}

