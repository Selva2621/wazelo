"use client";

import { useState } from "react";
import {
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
} from "lucide-react";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useScoringRules,
  useCreateScoringRule,
  useUpdateScoringRule,
  useDeleteScoringRule,
} from "@/hooks/use-lead-scoring";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import { SCORING_SIGNALS } from "@/lib/types/lead-scoring";
import type { LeadScoringRule, CreateScoringRuleRequest } from "@/lib/types/lead-scoring";

// ─── Rule Form Modal ───────────────────────────────────────────────────────────

interface RuleFormProps {
  initial?: LeadScoringRule;
  onSave: (data: CreateScoringRuleRequest) => void;
  onClose: () => void;
  isPending: boolean;
}

function RuleFormModal({ initial, onSave, onClose, isPending }: RuleFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [signal, setSignal] = useState(initial?.signal ?? SCORING_SIGNALS[0].value);
  const [points, setPoints] = useState<number>(initial?.points ?? 10);
  const [maxPerContact, setMaxPerContact] = useState<number>(initial?.maxPerContact ?? 0);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSave({ name, description: description || undefined, signal, points, maxPerContact });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-surface-container-lowest rounded-2xl shadow-xl border border-outline-variant/10 p-6">
        <h2 className="text-[16px] font-semibold text-on-surface mb-5">
          {initial ? "Edit Rule" : "New Scoring Rule"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Rule Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              placeholder="e.g. First message received"
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Optional — explain when this rule fires"
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Signal */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Trigger Signal <span className="text-error">*</span>
            </label>
            <select
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SCORING_SIGNALS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Points */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Points <span className="text-error">*</span>
              <span className="ml-1 text-on-surface-variant/50 font-normal">(-100 to +100)</span>
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              min={-100}
              max={100}
              required
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-[11px] text-on-surface-variant/60">
              Positive = higher quality lead. Negative = lower quality.
            </p>
          </div>

          {/* Max per contact */}
          <div>
            <label className="block text-[12px] font-medium text-on-surface-variant mb-1">
              Max fires per contact
              <span className="ml-1 text-on-surface-variant/50 font-normal">(0 = unlimited)</span>
            </label>
            <input
              type="number"
              value={maxPerContact}
              onChange={(e) => setMaxPerContact(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
              {isPending ? <Spinner size="sm" className="mr-1.5" /> : null}
              {initial ? "Save Changes" : "Create Rule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? "bg-green-500" :
    pct >= 40 ? "bg-yellow-500" :
    "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-outline-variant/20 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-semibold text-on-surface tabular-nums w-7 text-right">
        {score}
      </span>
    </div>
  );
}

// ─── Rule Row ────────────────────────────────────────────────────────────────

interface RuleRowProps {
  rule: LeadScoringRule;
  onEdit: (rule: LeadScoringRule) => void;
  onDelete: (id: string) => void;
  onToggle: (rule: LeadScoringRule) => void;
}

function RuleRow({ rule, onEdit, onDelete, onToggle }: RuleRowProps) {
  const signal = SCORING_SIGNALS.find((s) => s.value === rule.signal);
  const isPositive = rule.points >= 0;

  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container/50 transition-colors group border-b border-outline-variant/8 last:border-0">
      {/* Toggle */}
      <button
        onClick={() => onToggle(rule)}
        className="shrink-0 text-on-surface-variant hover:text-primary transition-colors"
        title={rule.enabled ? "Disable rule" : "Enable rule"}
      >
        {rule.enabled ? (
          <ToggleRight className="h-5 w-5 text-primary" />
        ) : (
          <ToggleLeft className="h-5 w-5" />
        )}
      </button>

      {/* Signal */}
      <div className="w-44 shrink-0">
        <Badge variant={rule.enabled ? "primary" : "default"} className="text-[11px]">
          {signal?.label ?? rule.signal}
        </Badge>
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-medium truncate ${rule.enabled ? "text-on-surface" : "text-on-surface-variant/60"}`}>
          {rule.name}
        </p>
        {rule.description && (
          <p className="text-[11px] text-on-surface-variant/60 truncate mt-0.5">
            {rule.description}
          </p>
        )}
      </div>

      {/* Points */}
      <div className="w-20 shrink-0 text-right">
        <span className={`text-[13px] font-semibold tabular-nums ${isPositive ? "text-green-600" : "text-red-500"}`}>
          {isPositive ? "+" : ""}{rule.points} pts
        </span>
      </div>

      {/* Max fires */}
      <div className="w-28 shrink-0 text-[12px] text-on-surface-variant/60 text-center">
        {rule.maxPerContact === 0 ? "Unlimited" : `Max ${rule.maxPerContact}×`}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(rule)}
          className="p-1.5 rounded-lg hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors"
          title="Edit rule"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          className="p-1.5 rounded-lg hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
          title="Delete rule"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function LeadScoringPage() {
  usePageTitle("Lead Scoring");

  const { data: rules, isLoading, isError } = useScoringRules();
  const createRule = useCreateScoringRule();
  const updateRule = useUpdateScoringRule();
  const deleteRule = useDeleteScoringRule();

  const [showCreate, setShowCreate] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadScoringRule | null>(null);

  function handleCreate(data: CreateScoringRuleRequest) {
    createRule.mutate(data, { onSuccess: () => setShowCreate(false) });
  }

  function handleUpdate(data: CreateScoringRuleRequest) {
    if (!editingRule) return;
    updateRule.mutate({ id: editingRule.id, ...data }, { onSuccess: () => setEditingRule(null) });
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this scoring rule?")) return;
    deleteRule.mutate(id);
  }

  function handleToggle(rule: LeadScoringRule) {
    updateRule.mutate({ id: rule.id, enabled: !rule.enabled });
  }

  const enabledCount = rules?.filter((r) => r.enabled).length ?? 0;
  const totalPoints = rules?.filter((r) => r.enabled).reduce((sum, r) => sum + r.points, 0) ?? 0;

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-[18px] font-semibold text-on-surface">Lead Scoring</h1>
          {rules && rules.length > 0 && (
            <span className="text-[12px] text-on-surface-variant/60">
              {enabledCount} active rule{enabledCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => setShowCreate(true)}>
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Rule
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" className="text-primary" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-xl bg-error/10 border border-error/20 p-4 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-error shrink-0" />
            <p className="text-[13px] text-error">Failed to load scoring rules. Please refresh.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && rules?.length === 0 && (
          <EmptyState
            icon={<TrendingUp className="h-14 w-14" />}
            title="No scoring rules yet"
            description="Create rules to automatically score leads based on their activity — helping your team prioritize the hottest contacts."
            actionLabel="Create First Rule"
            onAction={() => setShowCreate(true)}
          />
        )}

        {/* Stats row */}
        {rules && rules.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-4">
              <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider mb-1">Total Rules</p>
              <p className="text-[22px] font-semibold text-on-surface tabular-nums">{rules.length}</p>
            </div>
            <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-4">
              <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider mb-1">Active Rules</p>
              <p className="text-[22px] font-semibold text-primary tabular-nums">{enabledCount}</p>
            </div>
            <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 p-4">
              <p className="text-[11px] text-on-surface-variant/60 uppercase tracking-wider mb-1">Max Possible Score</p>
              <p className={`text-[22px] font-semibold tabular-nums ${totalPoints >= 0 ? "text-green-600" : "text-red-500"}`}>
                {totalPoints >= 0 ? "+" : ""}{totalPoints}
              </p>
            </div>
          </div>
        )}

        {/* How scoring works info */}
        {rules && rules.length > 0 && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 px-4 py-3 flex items-start gap-3">
            <TrendingUp className="h-4 w-4 text-primary shrink-0 mt-0.5" />
            <div className="text-[12px] text-on-surface-variant leading-relaxed">
              <span className="font-medium text-on-surface">How it works:</span>{" "}
              Each time a contact triggers a signal (e.g. sends a message), matching rules fire and add/subtract points from their lead score (0–100).
              High-scoring leads appear highlighted in your Contacts list.
            </div>
          </div>
        )}

        {/* Rules Table */}
        {rules && rules.length > 0 && (
          <div className="rounded-xl bg-surface-container-lowest border border-outline-variant/10 overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-outline-variant/10 bg-surface-container/40">
              <div className="w-5 shrink-0" />
              <div className="w-44 shrink-0 text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                Signal
              </div>
              <div className="flex-1 text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                Rule
              </div>
              <div className="w-20 shrink-0 text-right text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                Points
              </div>
              <div className="w-28 shrink-0 text-center text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-wider">
                Limit
              </div>
              <div className="w-16 shrink-0" />
            </div>

            {/* Rows */}
            {rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onEdit={setEditingRule}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <RuleFormModal
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
          isPending={createRule.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingRule && (
        <RuleFormModal
          initial={editingRule}
          onSave={handleUpdate}
          onClose={() => setEditingRule(null)}
          isPending={updateRule.isPending}
        />
      )}
    </div>
  );
}
