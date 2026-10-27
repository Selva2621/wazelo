"use client";

import { useState } from "react";
import { Kanban, Plus } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { FilterSelect } from "@/components/ui/filter-bar";
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

  const activePipeline =
    pipelines?.find((p) => p.id === selectedPipelineId) ??
    pipelines?.find((p) => p.isDefault) ??
    pipelines?.[0] ??
    null;

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
          actionLabel="Create pipeline"
          onAction={() =>
            createPipeline.mutate({ name: "Sales Pipeline" })
          }
        />
      </div>
    );
  }

  const pipelineSelect =
    pipelines.length > 1 ? (
      <FilterSelect
        label="Pipeline"
        value={activePipeline?.id || ""}
        onChange={(e) => setSelectedPipelineId(e.target.value)}
        className="font-medium text-on-surface"
      >
        {pipelines.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </FilterSelect>
    ) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      {/* On mobile only the pipeline picker stays (title and buttons live in the nav bar) */}
      <div className={`shrink-0 px-6 pt-5 pb-3 max-lg:px-4 max-lg:pt-1 max-lg:pb-2 ${pipelines.length > 1 ? "" : "max-lg:hidden"}`}>
        <PageHeader
          className="max-lg:hidden"
          title="Deals"
          actions={
            <>
              {pipelineSelect}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => createPipeline.mutate({ name: `Pipeline ${(pipelines.length || 0) + 1}` })}
                disabled={createPipeline.isPending}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New pipeline
              </Button>
            </>
          }
        />
        <div className="lg:hidden">{pipelineSelect}</div>
      </div>

      {/* Board */}
      {activePipeline && (
        <div className="flex-1 min-h-0">
          <PipelineBoard
            pipeline={activePipeline}
            mobileMore={[{
              label: "New pipeline",
              disabled: createPipeline.isPending,
              onSelect: () => createPipeline.mutate({ name: `Pipeline ${(pipelines.length || 0) + 1}` }),
            }]}
          />
        </div>
      )}
    </div>
  );
}
