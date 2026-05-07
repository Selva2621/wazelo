"use client";

import { useState, useMemo } from "react";
import { Plus, BarChart3, TrendingUp, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DealCard } from "./deal-card";
import { CreateDealModal } from "./create-deal-modal";
import { DealDetailDrawer } from "./deal-detail-drawer";
import { useDeals, useMoveDeal, useDealAnalytics } from "@/hooks/use-deals";
import type { Pipeline, Deal, PipelineStage } from "@/lib/types/deals";

interface PipelineBoardProps {
  pipeline: Pipeline;
}

export function PipelineBoard({ pipeline }: PipelineBoardProps) {
  const { data: deals, isLoading } = useDeals(pipeline.id);
  const { data: analytics } = useDealAnalytics(pipeline.id);
  const moveDeal = useMoveDeal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const map = new Map<string, Deal[]>();
    for (const stage of pipeline.stages) {
      map.set(stage.id, []);
    }
    for (const deal of deals || []) {
      const list = map.get(deal.stageId);
      if (list) list.push(deal);
    }
    return map;
  }, [deals, pipeline.stages]);

  const selectedDeal = deals?.find((d) => d.id === selectedDealId) ?? null;

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    setDraggedDealId(dealId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const deal = deals?.find((d) => d.id === draggedDealId);
    if (!deal || deal.stageId === stage.id) {
      setDraggedDealId(null);
      return;
    }

    const status = stage.isWonStage ? "WON" : stage.isLostStage ? "LOST" : "OPEN";
    moveDeal.mutate({
      pipelineId: pipeline.id,
      dealId: draggedDealId,
      stageId: stage.id,
      status: status as any,
    });
    setDraggedDealId(null);
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Summary bar */}
      {analytics && (
        <div className="shrink-0 flex items-center gap-6 px-6 py-3 border-b border-outline-variant/10 bg-surface-container/30">
          <div className="flex items-center gap-2 text-[13px]">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-on-surface-variant">Total:</span>
            <span className="font-semibold text-on-surface">{analytics.totalDeals} deals</span>
          </div>
          <div className="flex items-center gap-2 text-[13px]">
            <DollarSign className="h-4 w-4 text-tertiary" />
            <span className="text-on-surface-variant">Value:</span>
            <span className="font-semibold text-on-surface">{formatCurrency(Number(analytics.totalValue))}</span>
          </div>
          {analytics.byStatus.find((s) => s.status === "WON") && (
            <div className="flex items-center gap-2 text-[13px]">
              <TrendingUp className="h-4 w-4 text-success" />
              <span className="text-on-surface-variant">Won:</span>
              <span className="font-semibold text-success">
                {analytics.byStatus.find((s) => s.status === "WON")!.count} deals
              </span>
            </div>
          )}
          <div className="ml-auto">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Deal
            </Button>
          </div>
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="flex gap-4 p-6 min-h-0 h-full">
          {pipeline.stages.map((stage) => {
            const stageDeals = dealsByStage.get(stage.id) || [];
            const stageAnalytics = analytics?.byStage.find((s) => s.stageId === stage.id);

            return (
              <div
                key={stage.id}
                className="flex flex-col w-[280px] shrink-0 rounded-xl bg-surface-container/40 border border-outline-variant/10"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, stage)}
              >
                {/* Stage header */}
                <div className="shrink-0 flex items-center justify-between px-3.5 py-3 border-b border-outline-variant/10">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: stage.color || "#6b7280" }}
                    />
                    <span className="text-[13px] font-semibold text-on-surface">{stage.name}</span>
                    <Badge variant="muted" className="text-[10px]">{stageDeals.length}</Badge>
                  </div>
                  {stageAnalytics && stageAnalytics.value > 0 && (
                    <span className="text-[10px] text-on-surface-variant">
                      {formatCurrency(Number(stageAnalytics.value))}
                    </span>
                  )}
                </div>

                {/* Stage deals */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {stageDeals.length === 0 ? (
                    <div className="text-center py-6 text-[12px] text-on-surface-variant/40">
                      Drop deals here
                    </div>
                  ) : (
                    stageDeals.map((deal) => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        className="cursor-grab active:cursor-grabbing"
                      >
                        <DealCard
                          deal={deal}
                          onClick={() => setSelectedDealId(deal.id)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <CreateDealModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        pipelineId={pipeline.id}
        stages={pipeline.stages}
      />

      {selectedDeal && (
        <DealDetailDrawer
          deal={selectedDeal}
          pipelineId={pipeline.id}
          stages={pipeline.stages}
          onClose={() => setSelectedDealId(null)}
        />
      )}
    </div>
  );
}
