"use client";

import { useState, useMemo } from "react";
import { AnimatePresence } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { DealCard } from "./deal-card";
import { CreateDealModal } from "./create-deal-modal";
import { DealDetailDrawer } from "./deal-detail-drawer";
import { useDeals, useMoveDeal, useDealAnalytics } from "@/hooks/use-deals";
import type { Pipeline, Deal, PipelineStage } from "@/lib/types/deals";
import { useOrgSettings } from "@/hooks/use-settings";
import { formatAmount } from "@/lib/utils";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { ActionSheet, type ActionSheetAction } from "@/components/ios/action-sheet";
import { Avatar } from "@/components/ui/avatar";
import { StageChip, StageNote, StagePanel, StageRow, StageTabs } from "@/components/ui/swipe-columns";
import { formatFollowUp } from "./contact-deal-card";

interface PipelineBoardProps {
  pipeline: Pipeline;
  /** Extra items for the mobile nav bar's "…" menu */
  mobileMore?: ActionSheetAction[];
}

export function PipelineBoard({ pipeline, mobileMore }: PipelineBoardProps) {
  const { data: deals, isLoading } = useDeals(pipeline.id);
  const { data: analytics } = useDealAnalytics(pipeline.id);
  const moveDeal = useMoveDeal();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  // Phones: one stage at a time, and a row's ⋮ menu instead of dragging
  const [phoneStageId, setPhoneStageId] = useState<string | null>(null);
  const [menuDeal, setMenuDeal] = useState<Deal | null>(null);

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

  // Same move the drop below makes; the server sets WON/LOST/OPEN from the stage's flags
  const moveToStage = (deal: Deal, stage: PipelineStage) => {
    if (deal.stageId === stage.id) return;
    moveDeal.mutate({ pipelineId: pipeline.id, dealId: deal.id, stageId: stage.id });
  };

  const handleDrop = (e: React.DragEvent, stage: PipelineStage) => {
    e.preventDefault();
    if (!draggedDealId) return;

    const deal = deals?.find((d) => d.id === draggedDealId);
    if (!deal || deal.stageId === stage.id) {
      setDraggedDealId(null);
      return;
    }

    // The server sets WON/LOST/OPEN from the stage's flags
    moveDeal.mutate({
      pipelineId: pipeline.id,
      dealId: draggedDealId,
      stageId: stage.id,
    });
    setDraggedDealId(null);
  };

  // Totals are shown in the org's currency
  const { data: orgSettings } = useOrgSettings();
  const formatCurrency = (val: number) => formatAmount(val, orgSettings?.currency);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" className="text-primary" />
      </div>
    );
  }

  const phoneStage = pipeline.stages.find((s) => s.id === phoneStageId) ?? pipeline.stages[0];
  const phoneDeals = phoneStage ? dealsByStage.get(phoneStage.id) ?? [] : [];
  const menuActions: ActionSheetAction[] = menuDeal
    ? [
        { label: "Open details", onSelect: () => setSelectedDealId(menuDeal.id) },
        ...pipeline.stages
          .filter((stage) => stage.id !== menuDeal.stageId)
          .map((stage) => ({ label: `Move to ${stage.name}`, onSelect: () => moveToStage(menuDeal, stage) })),
      ]
    : [];

  return (
    <div className="flex flex-col h-full max-lg:min-w-0">
      <MobilePageActions primary={{ label: "Add deal", onClick: () => setShowCreateModal(true) }} more={mobileMore} />

      {/* Summary bar: quiet numbers, primary action on the right */}
      {analytics && (
        <div data-tour="deals-summary" className="shrink-0 flex items-center gap-6 px-6 py-2.5 max-lg:flex-wrap max-lg:gap-x-4 max-lg:gap-y-1 max-lg:px-4 max-lg:py-2 border-b border-outline-variant">
          <div className="flex items-baseline gap-1.5 text-body">
            <span className="text-on-surface-variant">Deals</span>
            <span className="font-semibold tabular-nums text-on-surface">{analytics.totalDeals}</span>
          </div>
          <div className="flex items-baseline gap-1.5 text-body">
            <span className="text-on-surface-variant">Value</span>
            <span className="font-semibold tabular-nums text-on-surface">{formatCurrency(Number(analytics.totalValue))}</span>
          </div>
          {analytics.byStatus.find((s) => s.status === "WON") && (
            <div className="flex items-baseline gap-1.5 text-body">
              <span className="text-on-surface-variant">Won</span>
              <span className="font-semibold tabular-nums text-success">
                {analytics.byStatus.find((s) => s.status === "WON")!.count}
              </span>
            </div>
          )}
          <div className="ml-auto max-lg:hidden">
            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add deal
            </Button>
          </div>
        </div>
      )}

      {/* Phones: stage tabs (fixed) above the stage's list (the only part that scrolls) */}
      {phoneStage && (
        <>
          <StageTabs
            idBase="deal-stage"
            label="Stages"
            value={phoneStage.id}
            onChange={setPhoneStageId}
            className="shrink-0"
            tabs={pipeline.stages.map((stage) => ({
              id: stage.id,
              label: stage.name,
              count: dealsByStage.get(stage.id)?.length ?? 0,
              color: stage.color || "#6b7280",
            }))}
          />
          <StagePanel idBase="deal-stage" tabId={phoneStage.id}>
            {phoneDeals.length === 0 ? (
              <StageNote>No deals in this stage</StageNote>
            ) : (
              <ul className="bg-surface-container-lowest">
                {phoneDeals.map((deal) => {
                  const contactName = deal.contact.name || deal.contact.phoneNumber;
                  const followUp =
                    deal.status === "OPEN" && deal.nextFollowUpAt ? formatFollowUp(deal.nextFollowUpAt) : null;
                  return (
                    <StageRow
                      key={deal.id}
                      leading={<Avatar name={contactName} size="md" />}
                      title={deal.title}
                      trailing={deal.value !== null ? formatAmount(Number(deal.value), deal.currency) : undefined}
                      subtitle={contactName}
                      meta={
                        (followUp || deal.expectedClose || deal.assignedTo) && (
                          <>
                            {followUp && (
                              <StageChip className={followUp.overdue ? "bg-error/10 text-error" : undefined}>
                                {followUp.text}
                              </StageChip>
                            )}
                            {deal.expectedClose && (
                              <StageChip>
                                Close{" "}
                                {new Date(deal.expectedClose).toLocaleDateString("en-IN", {
                                  month: "short",
                                  day: "numeric",
                                })}
                              </StageChip>
                            )}
                            {deal.assignedTo && <StageChip>{deal.assignedTo.firstName}</StageChip>}
                          </>
                        )
                      }
                      onOpen={() => setSelectedDealId(deal.id)}
                      onMenu={() => setMenuDeal(deal)}
                      menuLabel={`Actions for ${deal.title}`}
                    />
                  );
                })}
              </ul>
            )}
          </StagePanel>
        </>
      )}

      {/* Kanban board (desktop; phones use the list above) */}
      <div data-tour="deals-board" className="flex-1 overflow-x-auto max-lg:hidden">
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
                    <span className="text-body font-semibold text-on-surface">{stage.name}</span>
                    <Badge variant="muted" className="text-caption">{stageDeals.length}</Badge>
                  </div>
                  {stageAnalytics && stageAnalytics.value > 0 && (
                    <span className="text-caption text-on-surface-variant">
                      {formatCurrency(Number(stageAnalytics.value))}
                    </span>
                  )}
                </div>

                {/* Stage deals */}
                <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                  {stageDeals.length === 0 ? (
                    <div className="text-center py-6 text-label text-on-surface-variant/40">
                      <span>Drop deals here</span>
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

      <ActionSheet
        open={!!menuDeal}
        onClose={() => setMenuDeal(null)}
        title={menuDeal?.title}
        actions={menuActions}
      />

      <CreateDealModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        pipelineId={pipeline.id}
        stages={pipeline.stages}
      />

      <AnimatePresence>
        {selectedDeal && (
          <DealDetailDrawer
            key={selectedDeal.id}
            deal={selectedDeal}
            pipelineId={pipeline.id}
            stages={pipeline.stages}
            onClose={() => setSelectedDealId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
