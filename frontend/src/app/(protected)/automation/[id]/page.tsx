"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Power,
  PowerOff,
  Trash2,
  Zap,
  AlertCircle,
  Save,
  Plus,
  GripVertical,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  MessageSquare,
  UserCheck,
  Tag,
  RefreshCcw,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { RuleStatusBadge } from "@/components/automation/rule-status-badge";
import { ExecutionLogsTable } from "@/components/automation/execution-logs-table";
import {
  useAutomationRule,
  useExecutionLogs,
  useEnableAutomationRule,
  useDisableAutomationRule,
  useDeleteAutomationRule,
  useUpdateAutomationRule,
} from "@/hooks/use-automation";
import type {
  AutomationActionType,
  AutomationTriggerType,
  AutomationConditionOperator,
} from "@/lib/types/automation";

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_TYPES: { value: AutomationTriggerType; label: string; group?: string }[] = [
  { value: "MESSAGE_RECEIVED",        label: "Message Received" },
  { value: "CONTACT_CREATED",         label: "Contact Created" },
  { value: "LEAD_STATUS_CHANGED",     label: "Lead Status Changed" },
  { value: "TIME_BASED",              label: "Time-Based (Cron)" },
  { value: "NO_REPLY",                label: "No Reply Follow-Up" },
  { value: "SHOPIFY_ORDER_CREATED",   label: "Shopify — Order Created",   group: "shopify" },
  { value: "SHOPIFY_ORDER_FULFILLED", label: "Shopify — Order Fulfilled",  group: "shopify" },
  { value: "SHOPIFY_CART_ABANDONED",  label: "Shopify — Cart Abandoned",   group: "shopify" },
  { value: "WIDGET_MESSAGE_RECEIVED", label: "Widget Message Received" },
];

const ACTION_TYPES: { value: AutomationActionType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "SEND_MESSAGE",   label: "Send Message",   icon: MessageSquare, color: "#6366f1" },
  { value: "ASSIGN_CONTACT", label: "Assign Contact", icon: UserCheck,     color: "#22c55e" },
  { value: "ADD_TAG",        label: "Add Tag",         icon: Tag,           color: "#ec4899" },
  { value: "UPDATE_STATUS",  label: "Update Status",   icon: RefreshCcw,    color: "#f59e0b" },
];

const CONDITION_FIELDS = [
  { value: "contact.name",        label: "Contact Name" },
  { value: "contact.phone",       label: "Contact Phone" },
  { value: "contact.leadStatus",  label: "Lead Status" },
  { value: "contact.tags",        label: "Contact Tags" },
  { value: "message.body",        label: "Message Body" },
  { value: "conversation.status", label: "Conversation Status" },
  { value: "trigger.keyword",     label: "Trigger Keyword" },
];

const CONDITION_OPERATORS: { value: AutomationConditionOperator; label: string }[] = [
  { value: "EQUALS",     label: "equals" },
  { value: "NOT_EQUALS", label: "not equals" },
  { value: "CONTAINS",   label: "contains" },
  { value: "IN",         label: "is one of" },
  { value: "NOT_IN",     label: "is not one of" },
];

const LEAD_STATUS_OPTIONS = ["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"];

const VAR_CHIPS = [
  { label: "Name",       value: "{{contact.name}}" },
  { label: "Phone",      value: "{{contact.phone}}" },
  { label: "Order #",    value: "{{shopify.order_name}}" },
  { label: "Total",      value: "{{shopify.total_price}}" },
  { label: "Items",      value: "{{shopify.items}}" },
  { label: "Cart Total", value: "{{shopify.cart_total}}" },
];

const TAKE = 20;

function formatDate(d: string) {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(d));
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-container/50 transition-colors"
      >
        <span className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{title}</span>
        {open ? <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" /> : <ChevronRight className="h-3.5 w-3.5 text-on-surface-variant" />}
      </button>
      {open && <div className="px-4 pb-4 pt-1 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Trigger config sub-form ──────────────────────────────────────────────────

interface TriggerConfigProps {
  triggerType: AutomationTriggerType;
  triggerConfig: Record<string, unknown>;
  onChange: (k: string, v: unknown) => void;
}

function TriggerConfigPanel({ triggerType, triggerConfig, onChange }: TriggerConfigProps) {
  const inputCls = "mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30";

  if (triggerType === "MESSAGE_RECEIVED" || triggerType === "WIDGET_MESSAGE_RECEIVED") {
    return (
      <div className="space-y-3">
        <div>
          <Label>Keyword (optional)</Label>
          <input
            className={inputCls}
            placeholder="e.g. hello, hi — leave empty to match all messages"
            value={String(triggerConfig.messageKeyword ?? "")}
            onChange={(e) => onChange("messageKeyword", e.target.value)}
          />
          <p className="text-[11px] text-on-surface-variant/50 mt-1">Leave blank to match every message.</p>
        </div>
      </div>
    );
  }

  if (triggerType === "LEAD_STATUS_CHANGED") {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>From Status</Label>
          <input
            className={inputCls}
            placeholder="e.g. NEW"
            value={String(triggerConfig.fromStatus ?? "")}
            onChange={(e) => onChange("fromStatus", e.target.value)}
          />
        </div>
        <div>
          <Label>To Status</Label>
          <input
            className={inputCls}
            placeholder="e.g. QUALIFIED"
            value={String(triggerConfig.toStatus ?? "")}
            onChange={(e) => onChange("toStatus", e.target.value)}
          />
        </div>
      </div>
    );
  }

  if (triggerType === "TIME_BASED") {
    return (
      <div>
        <Label>Cron Expression</Label>
        <input
          className={inputCls}
          placeholder="e.g. 0 9 * * 1 (every Monday at 9 AM)"
          value={String(triggerConfig.cronExpression ?? "")}
          onChange={(e) => onChange("cronExpression", e.target.value)}
        />
        <p className="text-[11px] text-on-surface-variant/50 mt-1">Uses standard cron syntax (UTC).</p>
      </div>
    );
  }

  if (triggerType === "NO_REPLY") {
    return (
      <div>
        <Label>Delay (seconds)</Label>
        <input
          className={inputCls}
          type="number"
          placeholder="e.g. 3600 (1 hour)"
          value={String(triggerConfig.delaySeconds ?? "")}
          onChange={(e) => onChange("delaySeconds", parseInt(e.target.value) || 0)}
        />
      </div>
    );
  }

  if (triggerType === "SHOPIFY_ORDER_CREATED" || triggerType === "SHOPIFY_ORDER_FULFILLED") {
    return (
      <div>
        <Label>Min Order Value (optional)</Label>
        <input
          className={inputCls}
          type="number"
          placeholder="e.g. 500 — only trigger above this amount"
          value={String(triggerConfig.minOrderValue ?? "")}
          onChange={(e) => onChange("minOrderValue", parseFloat(e.target.value) || undefined)}
        />
      </div>
    );
  }

  if (triggerType === "SHOPIFY_CART_ABANDONED") {
    return (
      <div>
        <Label>Min Cart Value (optional)</Label>
        <input
          className={inputCls}
          type="number"
          placeholder="e.g. 200 — only trigger above this amount"
          value={String(triggerConfig.minCartValue ?? "")}
          onChange={(e) => onChange("minCartValue", parseFloat(e.target.value) || undefined)}
        />
      </div>
    );
  }

  return (
    <p className="text-[12px] text-on-surface-variant/60 italic">No additional configuration needed for this trigger.</p>
  );
}

// ─── Condition row ────────────────────────────────────────────────────────────

interface ConditionRow {
  id: string;
  field: string;
  operator: AutomationConditionOperator;
  value: string;
}

interface ConditionBuilderProps {
  conditions: ConditionRow[];
  onChange: (rows: ConditionRow[]) => void;
}

function ConditionBuilder({ conditions, onChange }: ConditionBuilderProps) {
  const inputCls = "flex-1 px-2.5 py-1.5 rounded-lg border border-outline-variant/20 bg-surface-container-low text-[12px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20";
  const selectCls = `${inputCls} flex-none`;

  function add() {
    onChange([...conditions, { id: crypto.randomUUID(), field: "contact.name", operator: "EQUALS", value: "" }]);
  }

  function remove(id: string) {
    onChange(conditions.filter((c) => c.id !== id));
  }

  function update(id: string, key: keyof ConditionRow, value: string) {
    onChange(conditions.map((c) => (c.id === id ? { ...c, [key]: value } : c)));
  }

  return (
    <div className="space-y-2">
      {conditions.length === 0 && (
        <p className="text-[12px] text-on-surface-variant/50 italic">
          No conditions — rule fires for every matching trigger event.
        </p>
      )}
      {conditions.map((row, i) => (
        <div key={row.id} className="flex items-center gap-2">
          {i > 0 && (
            <span className="text-[10px] font-semibold text-primary uppercase shrink-0 w-6 text-center">AND</span>
          )}
          {i === 0 && <span className="w-6 shrink-0" />}

          <select
            value={row.field}
            onChange={(e) => update(row.id, "field", e.target.value)}
            className={`${selectCls} w-40`}
          >
            {CONDITION_FIELDS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <select
            value={row.operator}
            onChange={(e) => update(row.id, "operator", e.target.value as AutomationConditionOperator)}
            className={`${selectCls} w-28`}
          >
            {CONDITION_OPERATORS.map((op) => (
              <option key={op.value} value={op.value}>{op.label}</option>
            ))}
          </select>

          <input
            className={inputCls}
            placeholder="value"
            value={row.value}
            onChange={(e) => update(row.id, "value", e.target.value)}
          />

          <button
            type="button"
            onClick={() => remove(row.id)}
            className="p-1 rounded text-on-surface-variant/40 hover:text-error transition-colors shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"
      >
        <Plus className="h-3.5 w-3.5" />
        Add condition
      </button>
    </div>
  );
}

// ─── Action row ───────────────────────────────────────────────────────────────

interface ActionRow {
  id: string;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  delaySeconds: number;
  orderIndex: number;
}

interface ActionRowEditorProps {
  row: ActionRow;
  index: number;
  total: number;
  onUpdate: (id: string, patch: Partial<ActionRow>) => void;
  onRemove: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
}

function ActionRowEditor({ row, index, total, onUpdate, onRemove, onMoveUp, onMoveDown }: ActionRowEditorProps) {
  const inputCls = "w-full px-3 py-2 rounded-lg border border-outline-variant/20 bg-surface-container-low text-[12px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20";
  const meta = ACTION_TYPES.find((a) => a.value === row.actionType);
  const Icon = meta?.icon ?? MessageSquare;

  function setConfig(k: string, v: unknown) {
    onUpdate(row.id, { actionConfig: { ...row.actionConfig, [k]: v } });
  }

  function insertVar(variable: string) {
    const current = String(row.actionConfig.messageBody ?? "");
    setConfig("messageBody", current + variable);
  }

  return (
    <div className="rounded-xl border border-outline-variant/15 bg-surface-container p-3 space-y-3">
      {/* Action header */}
      <div className="flex items-center gap-2">
        {/* Order controls */}
        <div className="flex flex-col gap-0.5 shrink-0">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => onMoveUp(row.id)}
            className="p-0.5 rounded text-on-surface-variant/30 hover:text-on-surface-variant disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
          </button>
          <button
            type="button"
            disabled={index === total - 1}
            onClick={() => onMoveDown(row.id)}
            className="p-0.5 rounded text-on-surface-variant/30 hover:text-on-surface-variant disabled:opacity-20 transition-colors"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </div>

        {/* Step badge */}
        <span className="flex-shrink-0 h-5 w-5 rounded-full text-[11px] font-semibold flex items-center justify-center"
          style={{ backgroundColor: (meta?.color ?? "#6366f1") + "20", color: meta?.color ?? "#6366f1" }}
        >
          {index + 1}
        </span>

        {/* Type selector */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: meta?.color ?? "#6366f1" }} />
          <select
            value={row.actionType}
            onChange={(e) => onUpdate(row.id, { actionType: e.target.value as AutomationActionType, actionConfig: {} })}
            className="flex-1 min-w-0 px-2 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low text-[12px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            {ACTION_TYPES.map((a) => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {total > 1 && (
          <button
            type="button"
            onClick={() => onRemove(row.id)}
            className="p-1 rounded text-on-surface-variant/30 hover:text-error transition-colors shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Config */}
      {row.actionType === "SEND_MESSAGE" && (
        <div className="space-y-2 pl-8">
          <div>
            <Label className="text-[11px]">Message Body</Label>
            <textarea
              rows={3}
              value={String(row.actionConfig.messageBody ?? "")}
              onChange={(e) => setConfig("messageBody", e.target.value)}
              placeholder={"Hi {{contact.name}}, thanks for reaching out!"}
              className={`${inputCls} resize-none mt-1`}
            />
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {VAR_CHIPS.map((chip) => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => insertVar(chip.value)}
                  className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-mono hover:bg-primary/20 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[11px]">Session ID (optional)</Label>
            <input
              className={`${inputCls} mt-1`}
              placeholder="Leave blank to auto-detect"
              value={String(row.actionConfig.sessionId ?? "")}
              onChange={(e) => setConfig("sessionId", e.target.value)}
            />
          </div>
        </div>
      )}

      {row.actionType === "ASSIGN_CONTACT" && (
        <div className="pl-8">
          <Label className="text-[11px]">Assign To User ID</Label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="User UUID to assign contact to"
            value={String(row.actionConfig.assignToUserId ?? "")}
            onChange={(e) => setConfig("assignToUserId", e.target.value)}
          />
        </div>
      )}

      {row.actionType === "ADD_TAG" && (
        <div className="pl-8">
          <Label className="text-[11px]">Tag Name</Label>
          <input
            className={`${inputCls} mt-1`}
            placeholder="e.g. hot-lead"
            value={String(row.actionConfig.tagName ?? "")}
            onChange={(e) => setConfig("tagName", e.target.value)}
          />
        </div>
      )}

      {row.actionType === "UPDATE_STATUS" && (
        <div className="pl-8">
          <Label className="text-[11px]">New Status</Label>
          <select
            value={String(row.actionConfig.newStatus ?? "")}
            onChange={(e) => setConfig("newStatus", e.target.value)}
            className={`${inputCls} mt-1`}
          >
            <option value="">— Select status —</option>
            {LEAD_STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Delay */}
      <div className="pl-8 flex items-center gap-2">
        <Clock className="h-3.5 w-3.5 text-on-surface-variant/50 shrink-0" />
        <Label className="text-[11px] text-on-surface-variant/60 shrink-0">Delay before action:</Label>
        <input
          type="number"
          min={0}
          value={row.delaySeconds}
          onChange={(e) => onUpdate(row.id, { delaySeconds: parseInt(e.target.value) || 0 })}
          className="w-20 px-2 py-1 rounded-lg border border-outline-variant/20 bg-surface-container-low text-[12px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
        <span className="text-[11px] text-on-surface-variant/60">seconds</span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AutomationRuleEditorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [logsPage, setLogsPage] = useState(0);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<"builder" | "logs">("builder");
  const [isDirty, setIsDirty] = useState(false);
  const [saved, setSaved] = useState(false);

  // Editable state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [triggerType, setTriggerType] = useState<AutomationTriggerType>("MESSAGE_RECEIVED");
  const [triggerConfig, setTriggerConfig] = useState<Record<string, unknown>>({});
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [priority, setPriority] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [maxExecutionsPerContact, setMaxExecutionsPerContact] = useState(0);
  const [initialized, setInitialized] = useState(false);

  const { data: rule, isLoading, isError } = useAutomationRule(id);
  const { data: logsData, isLoading: logsLoading } = useExecutionLogs({
    ruleId: id,
    limit: TAKE,
    offset: logsPage * TAKE,
  });

  const updateRule = useUpdateAutomationRule();
  const enableRule = useEnableAutomationRule();
  const disableRule = useDisableAutomationRule();
  const deleteRule = useDeleteAutomationRule();

  // Initialize form from API data
  useEffect(() => {
    if (!rule || initialized) return;
    setName(rule.name);
    setDescription(rule.description ?? "");
    setTriggerType(rule.triggerType);
    setTriggerConfig(rule.triggerConfig as Record<string, unknown> ?? {});
    setConditions(
      (rule.conditions ?? []).map((c) => ({
        id: crypto.randomUUID(),
        field: c.field,
        operator: c.operator,
        value: String(c.value ?? ""),
      }))
    );
    setActions(
      rule.actions
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((a) => ({
          id: a.id,
          actionType: a.actionType,
          actionConfig: a.actionConfig,
          delaySeconds: a.delaySeconds,
          orderIndex: a.orderIndex,
        }))
    );
    setPriority(rule.priority);
    setCooldownSeconds(rule.cooldownSeconds);
    setMaxExecutionsPerContact(rule.maxExecutionsPerContact);
    setInitialized(true);
  }, [rule, initialized]);

  function markDirty() {
    setIsDirty(true);
    setSaved(false);
  }

  function handleToggle() {
    if (!rule) return;
    if (rule.status === "ACTIVE") disableRule.mutate(id);
    else enableRule.mutate(id);
  }

  function handleDelete() {
    deleteRule.mutate(id, { onSuccess: () => router.push("/automation") });
  }

  function handleSave() {
    updateRule.mutate(
      {
        ruleId: id,
        name,
        description: description || undefined,
        triggerType,
        triggerConfig,
        conditions: conditions.map(({ field, operator, value }) => ({ field, operator, value })),
        actions: actions.map((a, i) => ({
          actionType: a.actionType,
          actionConfig: a.actionConfig,
          orderIndex: i,
          delaySeconds: a.delaySeconds,
        })),
        priority,
        maxExecutionsPerContact,
        cooldownSeconds,
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        },
      }
    );
  }

  // Action helpers
  function addAction() {
    setActions((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        actionType: "SEND_MESSAGE",
        actionConfig: {},
        delaySeconds: 0,
        orderIndex: prev.length,
      },
    ]);
    markDirty();
  }

  function updateAction(rowId: string, patch: Partial<ActionRow>) {
    setActions((prev) => prev.map((a) => (a.id === rowId ? { ...a, ...patch } : a)));
    markDirty();
  }

  function removeAction(rowId: string) {
    setActions((prev) => prev.filter((a) => a.id !== rowId));
    markDirty();
  }

  function moveAction(rowId: string, dir: -1 | 1) {
    setActions((prev) => {
      const idx = prev.findIndex((a) => a.id === rowId);
      if (idx < 0) return prev;
      const next = [...prev];
      const swap = idx + dir;
      if (swap < 0 || swap >= next.length) return prev;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
    markDirty();
  }

  // ── Loading / error states ──

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
        <div className="px-6 pt-5 pb-4 flex items-center gap-3 border-b border-outline-variant/10">
          <div className="h-8 w-8 rounded-lg bg-surface-container-high animate-pulse" />
          <div className="h-5 w-48 rounded bg-surface-container-high animate-pulse" />
        </div>
        <div className="flex-1 px-6 py-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface-container-high animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !rule) {
    return (
      <div className="flex flex-col h-[calc(100vh-var(--header-height))] items-center justify-center">
        <EmptyState
          icon={<AlertCircle className="h-12 w-12 text-error" />}
          title="Rule not found"
          description="This automation rule does not exist or was deleted."
          actionLabel="Back to Automation"
          onAction={() => router.push("/automation")}
        />
      </div>
    );
  }

  const isToggling = enableRule.isPending || disableRule.isPending;

  // ── Render ──

  return (
    <div className="flex flex-col h-[calc(100vh-var(--header-height))]">
      {/* ── Header ── */}
      <div className="shrink-0 px-6 pt-4 pb-3 flex items-center justify-between border-b border-outline-variant/10 bg-surface-container-low">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/automation")}
            className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Zap className="h-4 w-4 text-on-surface-variant" />
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); markDirty(); }}
            className="text-[15px] font-semibold text-on-surface bg-transparent border-none outline-none w-[240px] focus:ring-0"
          />
          <RuleStatusBadge status={rule.status} />
        </div>

        <div className="flex items-center gap-2">
          {isDirty && (
            <span className="text-[11px] text-on-surface-variant/50">Unsaved changes</span>
          )}
          {saved && (
            <span className="flex items-center gap-1 text-[11px] text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Saved
            </span>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            loading={updateRule.isPending}
            disabled={!isDirty || updateRule.isPending}
          >
            <Save className="h-3.5 w-3.5 mr-1.5" />
            Save
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggle}
            loading={isToggling}
          >
            {rule.status === "ACTIVE" ? (
              <><PowerOff className="h-4 w-4 mr-1.5" />Disable</>
            ) : (
              <><Power className="h-4 w-4 mr-1.5" />Enable</>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-error hover:bg-error/10"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="shrink-0 flex gap-0 border-b border-outline-variant/10 px-6">
        {(["builder", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab === "builder" ? "Rule Builder" : "Execution Logs"}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {activeTab === "builder" ? (
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Stats bar */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] text-on-surface-variant px-1">
              <span>Created: <span className="text-on-surface">{formatDate(rule.createdAt)}</span></span>
              <span>Total executions: <span className="text-on-surface font-medium">{rule.executionCount.toLocaleString()}</span></span>
              {rule.lastTriggeredAt && (
                <span>Last triggered: <span className="text-on-surface">{formatDate(rule.lastTriggeredAt)}</span></span>
              )}
            </div>

            {/* Description */}
            <Section title="Description" defaultOpen={false}>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => { setDescription(e.target.value); markDirty(); }}
                placeholder="Optional description for this rule..."
                className="w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </Section>

            {/* Trigger */}
            <Section title="Trigger — When this happens…">
              <div className="space-y-3">
                <div>
                  <Label>Event Type</Label>
                  <select
                    value={triggerType}
                    onChange={(e) => {
                      setTriggerType(e.target.value as AutomationTriggerType);
                      setTriggerConfig({});
                      markDirty();
                    }}
                    className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-[13px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <optgroup label="General">
                      {TRIGGER_TYPES.filter((t) => !t.group).map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Shopify">
                      {TRIGGER_TYPES.filter((t) => t.group === "shopify").map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <TriggerConfigPanel
                  triggerType={triggerType}
                  triggerConfig={triggerConfig}
                  onChange={(k, v) => {
                    setTriggerConfig((prev) => ({ ...prev, [k]: v }));
                    markDirty();
                  }}
                />
              </div>
            </Section>

            {/* Conditions */}
            <Section title="Conditions — Only if…" defaultOpen={conditions.length > 0}>
              <ConditionBuilder
                conditions={conditions}
                onChange={(rows) => {
                  setConditions(rows);
                  markDirty();
                }}
              />
            </Section>

            {/* Actions */}
            <Section title={`Actions — Then do… (${actions.length})`}>
              <div className="space-y-2">
                {actions.map((action, i) => (
                  <ActionRowEditor
                    key={action.id}
                    row={action}
                    index={i}
                    total={actions.length}
                    onUpdate={updateAction}
                    onRemove={removeAction}
                    onMoveUp={(rid) => moveAction(rid, -1)}
                    onMoveDown={(rid) => moveAction(rid, 1)}
                  />
                ))}
                <button
                  type="button"
                  onClick={addAction}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-outline-variant/30 text-[12px] text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add action
                </button>
              </div>
            </Section>

            {/* Advanced Settings */}
            <Section title="Advanced Settings" defaultOpen={false}>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label>Priority</Label>
                  <Input
                    type="number"
                    value={priority}
                    onChange={(e) => { setPriority(parseInt(e.target.value) || 0); markDirty(); }}
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label>Max Exec / Contact</Label>
                  <Input
                    type="number"
                    value={maxExecutionsPerContact}
                    onChange={(e) => { setMaxExecutionsPerContact(parseInt(e.target.value) || 0); markDirty(); }}
                    placeholder="0 (unlimited)"
                  />
                </div>
                <div>
                  <Label>Cooldown (s)</Label>
                  <Input
                    type="number"
                    value={cooldownSeconds}
                    onChange={(e) => { setCooldownSeconds(parseInt(e.target.value) || 0); markDirty(); }}
                    placeholder="0"
                  />
                </div>
              </div>
            </Section>

            {/* Save footer */}
            {isDirty && (
              <div className="flex justify-end pb-2">
                <Button onClick={handleSave} loading={updateRule.isPending}>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save Changes
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Logs tab */
          <div className="rounded-xl border border-outline-variant/15 bg-surface-container-lowest overflow-hidden">
            <ExecutionLogsTable
              logs={logsData?.data ?? []}
              total={logsData?.total ?? 0}
              take={TAKE}
              skip={logsPage * TAKE}
              isLoading={logsLoading}
              onPageChange={setLogsPage}
            />
          </div>
        )}
      </div>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteDialog}
        title="Delete Automation Rule"
        message={`Are you sure you want to delete "${rule.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteRule.isPending}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
