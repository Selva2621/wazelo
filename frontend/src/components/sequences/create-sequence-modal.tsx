"use client";

import { useState } from "react";
import { X, Plus, Trash2, Clock, ArrowDown, GripVertical, GitBranch, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-products";
import type { CreateSequenceRequest, CreateSequenceStepRequest, StepCondition } from "@/lib/types/sequences";

interface CreateSequenceModalProps {
  sessionId: string;
  onSubmit: (data: CreateSequenceRequest) => void;
  onClose: () => void;
  submitting?: boolean;
}

const SEQUENCE_PRESETS = [
  {
    label: "Welcome Series",
    icon: "👋",
    name: "Welcome Series",
    description: "Onboard new contacts with a warm welcome sequence",
    exitOnReply: true,
    steps: [
      { messageType: "TEXT", messageBody: "Hi {{name}}! Welcome aboard. We're excited to have you. How can we help you today?", delayMinutes: 0, name: "Welcome" },
      { messageType: "TEXT", messageBody: "Hi {{name}}, just checking in! Did you get a chance to explore our services? Feel free to ask any questions.", delayMinutes: 1440, name: "Day 1 Check-in" },
      { messageType: "TEXT", messageBody: "Hey {{name}}, here's something you might find valuable — our most popular features that customers love. Want to learn more?", delayMinutes: 4320, name: "Day 3 Value" },
    ],
  },
  {
    label: "Follow-up Series",
    icon: "📞",
    name: "Follow-up Series",
    description: "Follow up after a conversation or meeting",
    exitOnReply: true,
    steps: [
      { messageType: "TEXT", messageBody: "Hi {{name}}, thank you for your time today! I wanted to follow up on our conversation. Do you have any questions?", delayMinutes: 60, name: "1 Hour Follow-up" },
      { messageType: "TEXT", messageBody: "Hi {{name}}, just a friendly reminder — I'm here if you need any more information or have questions about what we discussed.", delayMinutes: 1440, name: "Day 1 Reminder" },
      { messageType: "TEXT", messageBody: "Hey {{name}}, I don't want to miss the chance to help you. This is my last follow-up — let me know if you'd like to proceed!", delayMinutes: 4320, name: "Day 3 Last Chance" },
    ],
  },
  {
    label: "Re-engagement",
    icon: "🔄",
    name: "Re-engagement Campaign",
    description: "Win back inactive contacts",
    exitOnReply: true,
    steps: [
      { messageType: "TEXT", messageBody: "Hey {{name}}, we haven't heard from you in a while! We've been making some exciting improvements. Would you like to hear about what's new?", delayMinutes: 0, name: "Re-engage" },
      { messageType: "TEXT", messageBody: "Hi {{name}}, we miss you! Here's a special offer just for you. Reply 'YES' to learn more.", delayMinutes: 4320, name: "Special Offer" },
    ],
  },
];

const DELAY_PRESETS = [
  { label: "5 min", value: 5 },
  { label: "1 hour", value: 60 },
  { label: "4 hours", value: 240 },
  { label: "1 day", value: 1440 },
  { label: "2 days", value: 2880 },
  { label: "3 days", value: 4320 },
  { label: "7 days", value: 10080 },
];

export function CreateSequenceModal({ sessionId, onSubmit, onClose, submitting }: CreateSequenceModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [exitOnReply, setExitOnReply] = useState(true);
  const [audienceType, setAudienceType] = useState<"ALL" | "FILTERED">("ALL");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [steps, setSteps] = useState<(CreateSequenceStepRequest & { _key: number; conditions?: StepCondition[] })[]>([
    { _key: 0, messageType: "TEXT", messageBody: "", delayMinutes: 0 },
    { _key: 1, messageType: "TEXT", messageBody: "", delayMinutes: 1440 },
  ]);

  const { data: products } = useProducts();
  let nextKey = steps.length;

  const addStep = () => {
    setSteps([...steps, { _key: nextKey++, messageType: "TEXT", messageBody: "", delayMinutes: 1440 }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps(steps.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: unknown) => {
    setSteps(steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)));
  };

  const addCondition = (stepIndex: number) => {
    const step = steps[stepIndex];
    const conditions = step.conditions || [];
    updateStep(stepIndex, "conditions", [...conditions, { keyword: "", goToStepOrder: 0 }]);
  };

  const updateCondition = (stepIndex: number, condIndex: number, field: string, value: unknown) => {
    const conditions = [...(steps[stepIndex].conditions || [])];
    conditions[condIndex] = { ...conditions[condIndex], [field]: value };
    updateStep(stepIndex, "conditions", conditions);
  };

  const removeCondition = (stepIndex: number, condIndex: number) => {
    const conditions = (steps[stepIndex].conditions || []).filter((_, i) => i !== condIndex);
    updateStep(stepIndex, "conditions", conditions.length > 0 ? conditions : undefined);
  };

  const canSubmit = name.trim() && steps.length > 0 && steps.every((s) => s.messageBody?.trim());

  const handleSubmit = () => {
    if (!canSubmit || submitting) return;
    onSubmit({
      name: name.trim(),
      description: description.trim() || undefined,
      sessionId,
      audienceType,
      audienceFilters: audienceType === "FILTERED" && selectedProductIds.length > 0
        ? { productIds: selectedProductIds }
        : undefined,
      exitOnReply,
      steps: steps.map((s) => ({
        messageType: s.messageType || "TEXT",
        messageBody: s.messageBody,
        delayMinutes: s.delayMinutes ?? 1440,
        name: s.name,
        conditions: s.conditions?.filter((c) => c.keyword.trim()) || undefined,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40">
      <div className="w-full max-w-2xl rounded-3xl bg-surface shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
          <h2 className="text-lg font-semibold text-on-surface">Create Drip Sequence</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-on-surface-variant hover:text-error transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Quick Start Presets */}
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
              Quick Start
            </label>
            <div className="flex gap-2 mt-1.5">
              {SEQUENCE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setName(preset.name);
                    setDescription(preset.description);
                    setExitOnReply(preset.exitOnReply);
                    setSteps(preset.steps.map((s, i) => ({ ...s, _key: i })));
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant/20 bg-surface hover:bg-primary/5 hover:border-primary/30 transition-colors text-[12px] text-on-surface"
                >
                  <span>{preset.icon}</span>
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
              Sequence Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Welcome series, Re-engagement..."
              maxLength={255}
              className="w-full mt-1 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this sequence does..."
              rows={2}
              className="w-full mt-1 rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Exit on reply */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exitOnReply}
              onChange={(e) => setExitOnReply(e.target.checked)}
              className="rounded border-outline-variant/30 text-primary focus:ring-primary"
            />
            <span className="text-[13px] text-on-surface">Exit sequence when contact replies</span>
          </label>

          {/* Audience */}
          <div className="space-y-2">
            <label className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide flex items-center gap-1">
              <Filter className="h-3 w-3" /> Audience
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAudienceType("ALL")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
                  audienceType === "ALL"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface border-outline-variant/20 text-on-surface hover:bg-surface-container",
                )}
              >
                All Contacts
              </button>
              <button
                type="button"
                onClick={() => setAudienceType("FILTERED")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[12px] border transition-colors",
                  audienceType === "FILTERED"
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface border-outline-variant/20 text-on-surface hover:bg-surface-container",
                )}
              >
                Filtered by Product
              </button>
            </div>

            {audienceType === "FILTERED" && products && products.length > 0 && (
              <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                <span className="text-[11px] text-on-surface-variant/60">Select products:</span>
                {products.filter((p) => p.status === "ACTIVE").map((p) => (
                  <label key={p.id} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedProductIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProductIds([...selectedProductIds, p.id]);
                        } else {
                          setSelectedProductIds(selectedProductIds.filter((id) => id !== p.id));
                        }
                      }}
                      className="rounded border-outline-variant/30 text-primary focus:ring-primary"
                    />
                    <span className="text-[12px] text-on-surface">{p.name}</span>
                  </label>
                ))}
                {selectedProductIds.length === 0 && (
                  <p className="text-[10px] text-warning">Select at least one product</p>
                )}
              </div>
            )}

            {audienceType === "FILTERED" && (!products || products.length === 0) && (
              <p className="text-[11px] text-on-surface-variant/50 pl-2">
                No products created yet. Go to Settings → Products to create one.
              </p>
            )}
          </div>

          {/* Steps */}
          <div>
            <p className="text-[11px] font-medium text-on-surface-variant/60 uppercase tracking-wide mb-2">
              Steps ({steps.length})
            </p>

            <div className="space-y-0">
              {steps.map((step, index) => (
                <div key={step._key}>
                  {/* Delay indicator (skip for first step) */}
                  {index > 0 && (
                    <div className="flex items-center gap-2 py-2 pl-6">
                      <ArrowDown className="h-4 w-4 text-on-surface-variant/40" />
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-on-surface-variant/50" />
                        <span className="text-[11px] text-on-surface-variant/60">Wait</span>
                        <select
                          value={step.delayMinutes}
                          onChange={(e) => updateStep(index, "delayMinutes", parseInt(e.target.value))}
                          className="rounded-lg border border-outline-variant/20 bg-surface px-2 py-0.5 text-[11px] text-on-surface focus:border-primary focus:outline-none"
                        >
                          {DELAY_PRESETS.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step card */}
                  <div className="rounded-xl border border-outline-variant/20 bg-surface-container p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <GripVertical className="h-4 w-4 text-on-surface-variant/30" />
                      <span className="text-[12px] font-semibold text-on-surface-variant">
                        Step {index + 1}
                      </span>
                      <input
                        value={step.name || ""}
                        onChange={(e) => updateStep(index, "name", e.target.value)}
                        placeholder="Step name (optional)"
                        className="flex-1 rounded-lg border-0 bg-transparent px-2 py-0.5 text-[12px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
                      />
                      {steps.length > 1 && (
                        <button
                          onClick={() => removeStep(index)}
                          className="p-1 text-on-surface-variant hover:text-error transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <textarea
                      value={step.messageBody || ""}
                      onChange={(e) => updateStep(index, "messageBody", e.target.value)}
                      placeholder="Message content..."
                      rows={2}
                      maxLength={4096}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface px-2.5 py-1.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none resize-none"
                    />

                    {/* Conditions button */}
                    {steps.length > 1 && (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() => addCondition(index)}
                          className="flex items-center gap-1 text-[11px] text-tertiary hover:text-tertiary/80 transition-colors"
                        >
                          <GitBranch className="h-3 w-3" /> Add Condition
                        </button>
                      </div>
                    )}

                    {/* Conditions */}
                    {step.conditions && step.conditions.length > 0 && (
                      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-tertiary/30">
                        <p className="text-[10px] font-medium text-tertiary/70 uppercase tracking-wide">
                          If customer replies with keyword:
                        </p>
                        {step.conditions.map((cond, ci) => (
                          <div key={ci} className="flex items-center gap-2">
                            <input
                              value={cond.keyword}
                              onChange={(e) => updateCondition(index, ci, "keyword", e.target.value)}
                              placeholder="keyword..."
                              className="flex-1 rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-[11px] text-on-surface focus:border-tertiary focus:outline-none"
                            />
                            <span className="text-[10px] text-on-surface-variant/50">→ go to</span>
                            <select
                              value={cond.goToStepOrder}
                              onChange={(e) => updateCondition(index, ci, "goToStepOrder", parseInt(e.target.value))}
                              className="rounded-lg border border-outline-variant/20 bg-surface px-2 py-1 text-[11px] text-on-surface"
                            >
                              {steps.map((_, si) => (
                                <option key={si} value={si}>Step {si + 1}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => removeCondition(index, ci)}
                              className="p-0.5 text-on-surface-variant hover:text-error"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addStep}
              className="mt-2 flex items-center gap-1.5 text-[12px] font-medium text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add step
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting ? "Creating..." : "Create Sequence"}
          </Button>
        </div>
      </div>

    </div>
  );
}
