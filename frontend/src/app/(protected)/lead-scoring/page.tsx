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
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";

// ─── Rule Form Modal ───────────────────────────────────────────────────────────

interface RuleFormProps {
  initial?: LeadScoringRule;
  onSave: (data: CreateScoringRuleRequest) => void;
  onClose: () => void;
  isPending: boolean;
}

function RuleFormModal({ open, ...props }: RuleFormProps & { open: boolean }) {
  return (
    <Modal
      open={open}
      onClose={props.onClose}
      dismissible={!props.isPending}
      aria-labelledby="rule-form-title"
      className="max-w-md border border-outline-variant/10 p-6"
    >
      {/* Form state lives in a child so it re-initialises each time the modal opens. */}
      {() => <RuleForm {...props} />}
    </Modal>
  );
}

function RuleForm({ initial, onSave, onClose, isPending }: RuleFormProps) {
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
      <>
        <h2 id="rule-form-title" className="text-title-sm font-semibold text-on-surface mb-5">
          {initial ? "Edit Rule" : "New Scoring Rule"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-label font-medium text-on-surface-variant mb-1">
              Rule Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              placeholder="e.g. First message received"
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-body text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-label font-medium text-on-surface-variant mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              rows={2}
              placeholder="Optional — explain when this rule fires"
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-body text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Signal */}
          <div>
            <label className="block text-label font-medium text-on-surface-variant mb-1">
              Trigger Signal <span className="text-error">*</span>
            </label>
            <select
              value={signal}
              onChange={(e) => setSignal(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SCORING_SIGNALS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          {/* Points */}
          <div>
            <label className="block text-label font-medium text-on-surface-variant mb-1">
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
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <p className="mt-1 text-caption text-on-surface-variant/60">
              Positive = higher quality lead. Negative = lower quality.
            </p>
          </div>

          {/* Max per contact */}
          <div>
            <label className="block text-label font-medium text-on-surface-variant mb-1">
              Max fires per contact
              <span className="ml-1 text-on-surface-variant/50 font-normal">(0 = unlimited)</span>
            </label>
            <input
              type="number"
              value={maxPerContact}
              onChange={(e) => setMaxPerContact(Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/20 text-body text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || !name.trim()}>
              {isPending ? <Spinner size="sm" className="mr-1.5" /> : null}
              {initial ? "Save changes" : "Create rule"}
            </Button>
          </div>
        </form>
      </>
  );
}

// ─── Score Bar ────────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.min(100, Math.max(0, score));
  const color =
    pct >= 70 ? "bg-success" :
    pct >= 40 ? "bg-warning" :
    "bg-error";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-outline-variant/20 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-label font-semibold text-on-surface tabular-nums w-7 text-right">
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
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-surface-container-low transition-colors group border-b border-outline-variant/40 last:border-0 max-lg:flex-wrap max-lg:gap-x-3 max-lg:gap-y-1.5">
      {/* Toggle */}
      <button
        type="button"
        onClick={() => onToggle(rule)}
        className="shrink-0 rounded-md text-on-surface-variant outline-none hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-focus max-lg:-m-2.5 max-lg:p-2.5"
        title={rule.enabled ? "Disable rule" : "Enable rule"}
        aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
        aria-pressed={rule.enabled}
      >
        {rule.enabled ? (
          <ToggleRight className="h-5 w-5 text-primary" />
        ) : (
          <ToggleLeft className="h-5 w-5" />
        )}
      </button>

      {/* Signal */}
      <div className="w-44 shrink-0 max-lg:order-2 max-lg:w-auto max-lg:ml-8">
        <Badge variant={rule.enabled ? "primary" : "default"} className="text-caption">
          {signal?.label ?? rule.signal}
        </Badge>
      </div>

      {/* Name + description */}
      <div className="flex-1 min-w-0">
        <p className={`text-body font-medium truncate ${rule.enabled ? "text-on-surface" : "text-on-surface-variant/60"}`}>
          {rule.name}
        </p>
        {rule.description && (
          <p className="text-caption text-on-surface-variant/60 truncate mt-0.5">
            {rule.description}
          </p>
        )}
      </div>

      {/* Points */}
      <div className="w-20 shrink-0 text-right max-lg:w-auto">
        <span className={`text-body font-semibold tabular-nums ${isPositive ? "text-success" : "text-error"}`}>
          {isPositive ? "+" : ""}{rule.points} pts
        </span>
      </div>

      {/* Max fires */}
      {/* Line break before signal + limit on mobile */}
      <div className="hidden max-lg:block max-lg:order-1 max-lg:basis-full max-lg:h-0" aria-hidden />

      <div className="w-28 shrink-0 text-label text-on-surface-variant/60 text-center max-lg:order-2 max-lg:w-auto">
        {rule.maxPerContact === 0 ? "Unlimited" : `Max ${rule.maxPerContact}×`}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity max-lg:opacity-100">
        <IconButton size="xs"
          onClick={() => onEdit(rule)}
         
          title="Edit rule" aria-label="Edit rule">
          <Pencil className="h-3.5 w-3.5" />
        </IconButton>
        <IconButton size="xs" variant="danger"
          onClick={() => onDelete(rule.id)}
         
          title="Delete rule" aria-label="Delete rule">
          <Trash2 className="h-3.5 w-3.5" />
        </IconButton>
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
      <MobilePageActions primary={{ label: "New rule", onClick: () => setShowCreate(true) }} />

      {/* Header: on mobile the nav bar has the title and "+" */}
      <PageHeader
        className="shrink-0 px-6 pt-5 pb-4 max-lg:hidden"
        title="Lead scoring"
        count={rules?.length}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New rule
          </Button>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4 max-lg:px-4 max-lg:pt-2">
        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" className="text-primary" />
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="rounded-2xl bg-error-container p-4 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 text-error shrink-0" />
            <p className="text-body text-error">Failed to load scoring rules. Please refresh.</p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !isError && rules?.length === 0 && (
          <EmptyState
            icon={<TrendingUp className="h-14 w-14" />}
            title="No scoring rules yet"
            description="Create rules to automatically score leads based on their activity — helping your team prioritize the hottest contacts."
            actionLabel="Create first rule"
            onAction={() => setShowCreate(true)}
          />
        )}

        {/* Stats row */}
        {rules && rules.length > 0 && (
          <div className="grid grid-cols-3 gap-3 max-lg:gap-2">
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
              <p className="text-label text-on-surface-variant mb-1">Total rules</p>
              <p className="text-headline font-semibold text-on-surface tabular-nums">{rules.length}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
              <p className="text-label text-on-surface-variant mb-1">Active rules</p>
              <p className="text-headline font-semibold text-on-surface tabular-nums">{enabledCount}</p>
            </div>
            <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant p-4">
              <p className="text-label text-on-surface-variant mb-1">Max possible score</p>
              <p className={`text-headline font-semibold tabular-nums ${totalPoints >= 0 ? "text-success" : "text-error"}`}>
                {totalPoints >= 0 ? "+" : ""}{totalPoints}
              </p>
            </div>
          </div>
        )}

        {/* How scoring works info */}
        {rules && rules.length > 0 && (
          <p className="text-label text-on-surface-variant">
            Matching rules add or subtract points when a contact triggers a signal. Scores run 0–100.
          </p>
        )}

        {/* Rules Table */}
        {rules && rules.length > 0 && (
          <div className="rounded-2xl bg-surface-container-lowest border border-outline-variant overflow-hidden">
            {/* Table header */}
            <div className="flex items-center gap-4 px-4 py-2.5 border-b border-outline-variant max-lg:hidden">
              <div className="w-5 shrink-0" />
              <div className="w-44 shrink-0 text-label font-medium text-on-surface-variant">
                Signal
              </div>
              <div className="flex-1 text-label font-medium text-on-surface-variant">
                Rule
              </div>
              <div className="w-20 shrink-0 text-right text-label font-medium text-on-surface-variant">
                Points
              </div>
              <div className="w-28 shrink-0 text-center text-label font-medium text-on-surface-variant">
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
      <RuleFormModal
        open={showCreate}
        onSave={handleCreate}
        onClose={() => setShowCreate(false)}
        isPending={createRule.isPending}
      />

      {/* Edit Modal */}
      <RuleFormModal
        open={editingRule !== null}
        initial={editingRule ?? undefined}
        onSave={handleUpdate}
        onClose={() => setEditingRule(null)}
        isPending={updateRule.isPending}
      />
    </div>
  );
}
