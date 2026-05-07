"use client";

import { useState } from "react";
import { Kanban, Plus, ChevronDown } from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import { usePipelines, useCreatePipeline } from "@/hooks/use-deals";
import { PipelineBoard } from "@/components/deals/pipeline-board";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";

export default function DealsPage() {
  usePageTitle("Deals");
  const { data: pipelines, isLoading } = usePipelines();
  const createPipeline = useCreatePipeline();
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(null);

  const activePipeline = pipelines?.find((p) => p.id === selectedPipelineId) ?? pipelines?.[0] ?? null;

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  if (!pipelines || pipelines.length === 0) {
    return (
      <div className="flex h-[calc(100vh-var(--header-height))] items-center justify-center">
        <EmptyState
          icon={<Kanban className="h-16 w-16" />}
          title="No pipelines yet"
          description="Create your first sales pipeline to start tracking deals."
          actionLabel="Create Pipeline"
          onAction={() =>
            createPipeline.mutate({ name: "Sales Pipeline" })
          }
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Kanban className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">Deals</h1>

          {/* Pipeline selector */}
          {pipelines.length > 1 && (
            <div className="relative">
              <select
                value={activePipeline?.id || ""}
                onChange={(e) => setSelectedPipelineId(e.target.value)}
                className="appearance-none pl-3 pr-7 py-1.5 rounded-lg bg-surface-container border border-outline-variant/10 text-[13px] font-medium text-on-surface cursor-pointer"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-on-surface-variant pointer-events-none" />
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => createPipeline.mutate({ name: `Pipeline ${(pipelines.length || 0) + 1}` })}
          disabled={createPipeline.isPending}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Pipeline
        </Button>
      </div>

      {/* Board */}
      {activePipeline && (
        <div className="flex-1 min-h-0">
          <PipelineBoard pipeline={activePipeline} />
        </div>
      )}
    </div>
  );
}
