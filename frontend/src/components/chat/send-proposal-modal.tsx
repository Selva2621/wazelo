"use client";

import { useState } from "react";
import { X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSendMessage } from "@/hooks/use-conversations";

interface SendProposalModalProps {
  conversationId: string;
  contactPhone: string;
  contactName?: string;
  onClose: () => void;
}

export function SendProposalModal({
  conversationId,
  contactPhone,
  contactName,
  onClose,
}: SendProposalModalProps) {
  const [serviceName, setServiceName] = useState("");
  const [price, setPrice] = useState("");
  const [timeline, setTimeline] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useSendMessage();

  function buildProposalText(): string {
    const lines: string[] = [
      "📋 *Project Proposal*",
      "",
      `*Service:* ${serviceName}`,
      `*Price:* ₹${price}`,
      `*Timeline:* ${timeline}`,
    ];

    if (description.trim()) {
      lines.push("");
      lines.push(description.trim());
    }

    lines.push("");
    lines.push("Reply YES to proceed or let me know if you have questions!");

    return lines.join("\n");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!serviceName.trim()) {
      setError("Service name is required.");
      return;
    }
    if (!price.trim() || isNaN(Number(price)) || Number(price) < 0) {
      setError("Please enter a valid price.");
      return;
    }
    if (!timeline.trim()) {
      setError("Timeline is required.");
      return;
    }

    sendMessage.mutate(
      {
        contactPhone,
        contactName,
        type: "TEXT",
        body: buildProposalText(),
        idempotencyKey: `proposal-${conversationId}-${Date.now()}`,
        conversationId,
      },
      {
        onSuccess: () => {
          onClose();
        },
        onError: () => {
          setError("Failed to send proposal. Please try again.");
        },
      }
    );
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Card */}
      <div className="relative w-full max-w-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-outline-variant/15 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-[14px] font-semibold text-on-surface">
              Send Proposal
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Service Name */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant uppercase tracking-wide mb-1.5">
              Service Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
              placeholder="e.g. Website Redesign"
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/50",
                "border-outline-variant/20 bg-surface-container focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
              )}
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant uppercase tracking-wide mb-1.5">
              Price (₹) <span className="text-error">*</span>
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-on-surface-variant">
                ₹
              </span>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
                className={cn(
                  "w-full rounded-lg border pl-7 pr-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/50",
                  "border-outline-variant/20 bg-surface-container focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
                )}
              />
            </div>
          </div>

          {/* Timeline */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant uppercase tracking-wide mb-1.5">
              Timeline <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={timeline}
              onChange={(e) => setTimeline(e.target.value)}
              placeholder="e.g. 2 weeks"
              className={cn(
                "w-full rounded-lg border px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/50",
                "border-outline-variant/20 bg-surface-container focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
              )}
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant uppercase tracking-wide mb-1.5">
              Description <span className="text-on-surface-variant/40">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the scope or deliverables..."
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg border px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/50",
                "border-outline-variant/20 bg-surface-container focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-colors"
              )}
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-[12px] text-error">{error}</p>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className={cn(
                "px-4 py-2 rounded-lg text-[13px] font-medium transition-colors",
                "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
              )}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sendMessage.isPending}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-medium transition-colors",
                "bg-primary text-on-primary hover:bg-primary/90",
                sendMessage.isPending && "opacity-60 cursor-not-allowed"
              )}
            >
              {sendMessage.isPending ? "Sending…" : "Send Proposal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
