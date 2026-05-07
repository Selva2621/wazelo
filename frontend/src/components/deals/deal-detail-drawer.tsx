"use client";

import { useState } from "react";
import { X, Save, Trash2, User, Calendar, DollarSign, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useUpdateDeal, useDeleteDeal } from "@/hooks/use-deals";
import type { Deal, PipelineStage } from "@/lib/types/deals";

interface DealDetailDrawerProps {
  deal: Deal;
  pipelineId: string;
  stages: PipelineStage[];
  onClose: () => void;
}

export function DealDetailDrawer({ deal, pipelineId, stages, onClose }: DealDetailDrawerProps) {
  const [title, setTitle] = useState(deal.title);
  const [value, setValue] = useState(deal.value?.toString() || "");
  const [notes, setNotes] = useState(deal.notes || "");
  const [expectedClose, setExpectedClose] = useState(
    deal.expectedClose ? deal.expectedClose.split("T")[0] : "",
  );

  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  const hasChanges =
    title !== deal.title ||
    value !== (deal.value?.toString() || "") ||
    notes !== (deal.notes || "") ||
    expectedClose !== (deal.expectedClose ? deal.expectedClose.split("T")[0] : "");

  const handleSave = () => {
    updateDeal.mutate(
      {
        pipelineId,
        dealId: deal.id,
        title: title.trim(),
        value: value ? parseFloat(value) : undefined,
        notes: notes || undefined,
        expectedClose: expectedClose || undefined,
      },
      { onSuccess: onClose },
    );
  };

  const handleDelete = () => {
    deleteDeal.mutate({ pipelineId, dealId: deal.id }, { onSuccess: onClose });
  };

  const statusColor = deal.status === "WON" ? "success" : deal.status === "LOST" ? "error" : "primary";

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-md bg-surface-container-lowest shadow-2xl border-l border-outline-variant/15 flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
          <div className="flex items-center gap-2">
            <h2 className="text-[16px] font-semibold text-on-surface">Deal Details</h2>
            <Badge variant={statusColor as any}>{deal.status}</Badge>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Contact info */}
          <div className="rounded-xl bg-surface-container/50 p-3.5 space-y-1">
            <p className="text-[12px] font-medium text-on-surface-variant">Contact</p>
            <p className="text-[14px] font-semibold text-on-surface">
              {deal.contact.name || deal.contact.phoneNumber}
            </p>
            <p className="text-[12px] text-on-surface-variant">{deal.contact.phoneNumber}</p>
            {deal.contact.email && (
              <p className="text-[12px] text-on-surface-variant">{deal.contact.email}</p>
            )}
          </div>

          {/* Product */}
          {deal.product && (
            <div className="rounded-xl bg-surface-container/50 p-3.5 space-y-1">
              <p className="text-[12px] font-medium text-on-surface-variant">Product</p>
              <Badge variant="info">{deal.product.name}</Badge>
            </div>
          )}

          {/* Stage */}
          <div className="rounded-xl bg-surface-container/50 p-3.5 space-y-1">
            <p className="text-[12px] font-medium text-on-surface-variant">Current Stage</p>
            <div className="flex items-center gap-2">
              <div
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: deal.stage.color || "#6b7280" }}
              />
              <p className="text-[14px] font-semibold text-on-surface">{deal.stage.name}</p>
            </div>
          </div>

          {/* Editable fields */}
          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-on-surface-variant flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Title
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5" /> Value
              </label>
              <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5" /> Expected Close
              </label>
              <Input type="date" value={expectedClose} onChange={(e) => setExpectedClose(e.target.value)} />
            </div>
          </div>

          {deal.assignedTo && (
            <div className="space-y-1.5">
              <label className="text-[12px] font-medium text-on-surface-variant flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" /> Assigned To
              </label>
              <p className="text-[13px] text-on-surface">
                {deal.assignedTo.firstName} {deal.assignedTo.lastName}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[12px] font-medium text-on-surface-variant">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/10 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 resize-none focus:outline-none focus:ring-1 focus:ring-primary/30"
              placeholder="Add notes about this deal..."
            />
          </div>

          <p className="text-[11px] text-on-surface-variant/40">
            Created {new Date(deal.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>

        {/* Footer */}
        <div className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-outline-variant/10">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={deleteDeal.isPending}
            className="text-error hover:text-error"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || updateDeal.isPending}
            loading={updateDeal.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
