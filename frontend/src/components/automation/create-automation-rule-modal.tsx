"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { X, Plus, Trash2, Sparkles, ChevronDown } from "lucide-react";
import { useForm, useFieldArray, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { useCreateAutomationRule, useGenerateAutomationRule } from "@/hooks/use-automation";
import { ProductSelectField } from "@/components/ui/product-select-field";
import {
  createAutomationRuleSchema,
  type CreateAutomationRuleFormData,
} from "@/lib/validations/automation";
import type {
  AutomationTriggerType,
  AutomationActionType,
} from "@/lib/types/automation";

interface CreateAutomationRuleModalProps {
  open: boolean;
  onClose: () => void;
}

const TRIGGER_TYPES: { value: AutomationTriggerType; label: string; group?: string }[] = [
  { value: "MESSAGE_RECEIVED",      label: "Message Received" },
  { value: "CONTACT_CREATED",       label: "Contact Created" },
  { value: "LEAD_STATUS_CHANGED",   label: "Lead Status Changed" },
  { value: "TIME_BASED",            label: "Time-Based (Cron)" },
  { value: "NO_REPLY",              label: "No Reply Follow-Up" },
  { value: "SHOPIFY_ORDER_CREATED",   label: "Shopify — Order Created",   group: "shopify" },
  { value: "SHOPIFY_ORDER_FULFILLED", label: "Shopify — Order Fulfilled",  group: "shopify" },
  { value: "SHOPIFY_CART_ABANDONED",  label: "Shopify — Cart Abandoned",   group: "shopify" },
  { value: "WIDGET_MESSAGE_RECEIVED", label: "Widget Message Received" },
];

const ACTION_TYPES: { value: AutomationActionType; label: string }[] = [
  { value: "SEND_MESSAGE",   label: "Send WhatsApp Message" },
  { value: "ASSIGN_CONTACT", label: "Assign Contact" },
  { value: "ADD_TAG",        label: "Add Tag" },
  { value: "UPDATE_STATUS",  label: "Update Lead Status" },
];

const LEAD_STATUS_OPTIONS = ["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"];

// Variable hint chips for message body textarea
const VAR_CHIPS = [
  { label: "Name",          value: "{{contact.name}}" },
  { label: "Phone",         value: "{{contact.phone}}" },
  { label: "Order #",       value: "{{shopify.order_name}}" },
  { label: "Total",         value: "{{shopify.total_price}}" },
  { label: "Currency",      value: "{{shopify.currency}}" },
  { label: "Items",         value: "{{shopify.items}}" },
  { label: "Recovery URL",  value: "{{shopify.recovery_url}}" },
  { label: "Cart Total",    value: "{{shopify.cart_total}}" },
];

// ─── Action config sub-form ───────────────────────────────────────────────────

interface ActionConfigFieldsProps {
  idx: number;
  actionType: AutomationActionType;
  register: ReturnType<typeof useForm<CreateAutomationRuleFormData>>["register"];
  setValue: ReturnType<typeof useForm<CreateAutomationRuleFormData>>["setValue"];
  getValues: ReturnType<typeof useForm<CreateAutomationRuleFormData>>["getValues"];
}

function ActionConfigFields({ idx, actionType, register, setValue, getValues }: ActionConfigFieldsProps) {
  const inputCls = "mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30";

  function insertVar(variable: string) {
    const field = `actions.${idx}.actionConfig.messageBody` as const;
    const current = (getValues(field as any) as string) || "";
    setValue(field as any, current + variable, { shouldDirty: true });
  }

  if (actionType === "SEND_MESSAGE") {
    return (
      <div className="space-y-3">
        {/* Session ID */}
        <div>
          <Label>WhatsApp Session ID</Label>
          <input
            {...register(`actions.${idx}.actionConfig.sessionId` as any)}
            placeholder="e.g. sess_xxxxxxxxxx"
            className={inputCls}
          />
          <p className="text-[11px] text-on-surface-variant/50 mt-1">
            Leave blank to use the contact's active session automatically.
          </p>
        </div>

        {/* Message Body */}
        <div>
          <Label>Message Body <span className="text-error">*</span></Label>
          <textarea
            {...register(`actions.${idx}.actionConfig.messageBody` as any)}
            rows={4}
            placeholder={"Hi {{contact.name}}, your order {{shopify.order_name}} for ₹{{shopify.total_price}} is confirmed! 🎉"}
            className={`${inputCls} resize-none`}
          />
          {/* Variable chips */}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {VAR_CHIPS.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => insertVar(chip.value)}
                className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-mono hover:bg-primary/20 transition-colors"
              >
                {chip.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-on-surface-variant/50 mt-1">
            Click chips to insert variables. Unknown variables are left as-is.
          </p>
        </div>
      </div>
    );
  }

  if (actionType === "ASSIGN_CONTACT") {
    return (
      <div>
        <Label>Assign To User ID <span className="text-error">*</span></Label>
        <input
          {...register(`actions.${idx}.actionConfig.assignToUserId` as any)}
          placeholder="User UUID to assign contact to"
          className={inputCls}
        />
      </div>
    );
  }

  if (actionType === "ADD_TAG") {
    return (
      <div>
        <Label>Tag Name <span className="text-error">*</span></Label>
        <input
          {...register(`actions.${idx}.actionConfig.tagName` as any)}
          placeholder="e.g. shopify-customer"
          className={inputCls}
        />
      </div>
    );
  }

  if (actionType === "UPDATE_STATUS") {
    return (
      <div>
        <Label>New Status <span className="text-error">*</span></Label>
        <select
          {...register(`actions.${idx}.actionConfig.newStatus` as any)}
          className={inputCls}
        >
          <option value="">— Select status —</option>
          {LEAD_STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}

// ─── Modal ────────────────────────────────────────────────────────────────────

export function CreateAutomationRuleModal({
  open,
  onClose,
}: CreateAutomationRuleModalProps) {
  const router = useRouter();
  const createRule = useCreateAutomationRule();
  const generateRule = useGenerateAutomationRule();
  const [productId, setProductId] = useState("");
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const promptRef = useRef<HTMLTextAreaElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    reset,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<CreateAutomationRuleFormData>({
    resolver: zodResolver(createAutomationRuleSchema),
    defaultValues: {
      triggerType: "MESSAGE_RECEIVED",
      triggerConfig: {},
      actions: [
        { actionType: "SEND_MESSAGE", actionConfig: {}, orderIndex: 0 },
      ],
    },
  });

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control, name: "actions" });

  const triggerType = watch("triggerType") as AutomationTriggerType;
  const actionTypes = useWatch({ control, name: "actions" });

  function onSubmit(data: CreateAutomationRuleFormData) {
    createRule.mutate({ ...data, productId: productId || undefined }, {
      onSuccess: (created) => {
        reset();
        setProductId("");
        onClose();
        // Navigate to the rule builder for further editing
        router.push(`/automation/${created.id}`);
      },
    });
  }

  function handleClose() {
    reset();
    setProductId("");
    setAiPrompt("");
    setShowAiPanel(false);
    onClose();
  }

  function handleGenerate() {
    if (!aiPrompt.trim()) return;
    generateRule.mutate(aiPrompt.trim(), {
      onSuccess: (data) => {
        const r = data.rule;
        setValue("name", r.name);
        setValue("description", r.description ?? "");
        setValue("triggerType", r.triggerType as AutomationTriggerType);
        setValue("triggerConfig", r.triggerConfig ?? {});
        if (r.cooldownSeconds) setValue("cooldownSeconds", r.cooldownSeconds);
        if (r.maxExecutionsPerContact) setValue("maxExecutionsPerContact", r.maxExecutionsPerContact);

        // Replace actions
        const mapped = (r.actions ?? []).map((a, i) => ({
          actionType: a.actionType as AutomationActionType,
          actionConfig: a.actionConfig ?? {},
          orderIndex: i,
          delaySeconds: a.delaySeconds ?? 0,
        }));
        setValue("actions", mapped.length ? mapped : [{ actionType: "SEND_MESSAGE", actionConfig: {}, orderIndex: 0 }]);

        setShowAiPanel(false);
        setAiPrompt("");
      },
    });
  }

  if (!open) return null;

  const isShopifyTrigger = triggerType === "SHOPIFY_ORDER_CREATED" || triggerType === "SHOPIFY_ORDER_FULFILLED";
  const isCartTrigger = triggerType === "SHOPIFY_CART_ABANDONED";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 max-h-[85vh] bg-surface-container rounded-2xl shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15 shrink-0">
          <h2 className="text-[16px] font-semibold text-on-surface">
            Create Automation Rule
          </h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto px-6 py-4 space-y-5"
        >
          {/* AI Generate Panel */}
          {!showAiPanel ? (
            <button
              type="button"
              onClick={() => {
                setShowAiPanel(true);
                setTimeout(() => promptRef.current?.focus(), 50);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-primary/20 bg-primary/5 text-[13px] text-primary hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Generate rule with AI
            </button>
          ) : (
            <div className="rounded-xl border border-primary/15 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-[12px] font-semibold uppercase tracking-wide">Generate with AI</span>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAiPanel(false); setAiPrompt(""); }}
                  className="p-1 rounded text-on-surface-variant/40 hover:text-on-surface transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <Label className="text-[12px]">Describe what you want to automate</Label>
                <textarea
                  ref={promptRef}
                  rows={3}
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleGenerate();
                  }}
                  placeholder={
                    "e.g. When a Shopify order is created, send a WhatsApp confirmation to the customer\n" +
                    "e.g. Follow up 1 hour after no reply with a gentle reminder\n" +
                    "e.g. When a new contact is created, tag them as 'new-lead' and update status to CONTACTED"
                  }
                  className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <p className="text-[11px] text-on-surface-variant/50 mt-1">
                  Press ⌘Enter to generate. The form will be filled automatically — you can review and edit before saving.
                </p>
              </div>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleGenerate}
                loading={generateRule.isPending}
                disabled={!aiPrompt.trim() || generateRule.isPending}
              >
                {generateRule.isPending ? (
                  <>
                    <Spinner size="sm" className="mr-1.5" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Generate rule
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Rule Name */}
          <div>
            <Label htmlFor="name">Rule Name</Label>
            <Input
              id="name"
              placeholder="e.g. Shopify order confirmation"
              error={errors.name?.message}
              {...register("name")}
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              rows={2}
              placeholder="Optional description..."
              {...register("description")}
              className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Trigger Type */}
          <div>
            <Label htmlFor="triggerType">Trigger</Label>
            <select
              id="triggerType"
              {...register("triggerType")}
              className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
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

          {/* Trigger Config — contextual fields */}
          <div className="rounded-xl border border-outline-variant/15 p-4 space-y-3">
            <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
              Trigger Configuration
            </p>

            {triggerType === "MESSAGE_RECEIVED" && (
              <div>
                <Label htmlFor="triggerConfig.messageKeyword">Keyword</Label>
                <Input
                  id="triggerConfig.messageKeyword"
                  placeholder='e.g. "hello" (leave empty to match all messages)'
                  {...register("triggerConfig.messageKeyword")}
                />
              </div>
            )}

            {triggerType === "LEAD_STATUS_CHANGED" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="triggerConfig.fromStatus">From Status</Label>
                  <Input
                    id="triggerConfig.fromStatus"
                    placeholder="e.g. NEW"
                    {...register("triggerConfig.fromStatus")}
                  />
                </div>
                <div>
                  <Label htmlFor="triggerConfig.toStatus">To Status</Label>
                  <Input
                    id="triggerConfig.toStatus"
                    placeholder="e.g. QUALIFIED"
                    {...register("triggerConfig.toStatus")}
                  />
                </div>
              </div>
            )}

            {triggerType === "TIME_BASED" && (
              <div>
                <Label htmlFor="triggerConfig.cronExpression">Cron Expression</Label>
                <Input
                  id="triggerConfig.cronExpression"
                  placeholder="e.g. 0 9 * * 1 (every Monday at 9AM)"
                  {...register("triggerConfig.cronExpression")}
                />
              </div>
            )}

            {triggerType === "NO_REPLY" && (
              <div>
                <Label htmlFor="triggerConfig.delaySeconds">Delay (seconds)</Label>
                <Input
                  id="triggerConfig.delaySeconds"
                  type="number"
                  placeholder="e.g. 3600 (1 hour)"
                  {...register("triggerConfig.delaySeconds", { valueAsNumber: true })}
                />
              </div>
            )}

            {triggerType === "CONTACT_CREATED" && (
              <p className="text-[12px] text-on-surface-variant/60">
                Triggers when any new contact is created.
              </p>
            )}

            {triggerType === "WIDGET_MESSAGE_RECEIVED" && (
              <div className="space-y-2">
                <div>
                  <Label htmlFor="triggerConfig.messageKeyword">Keyword Filter (optional)</Label>
                  <Input
                    id="triggerConfig.messageKeyword"
                    placeholder="e.g. pricing — leave empty to match all widget messages"
                    {...register("triggerConfig.messageKeyword")}
                  />
                </div>
                <p className="text-[12px] text-on-surface-variant/60">
                  Triggers when a visitor sends a message via your chat widget.
                </p>
              </div>
            )}

            {isShopifyTrigger && (
              <div>
                <Label htmlFor="triggerConfig.minOrderValue">Min Order Value (optional)</Label>
                <Input
                  id="triggerConfig.minOrderValue"
                  type="number"
                  placeholder="e.g. 500 — only trigger for orders above this amount"
                  {...register("triggerConfig.minOrderValue", { valueAsNumber: true })}
                />
              </div>
            )}

            {isCartTrigger && (
              <div>
                <Label htmlFor="triggerConfig.minCartValue">Min Cart Value (optional)</Label>
                <Input
                  id="triggerConfig.minCartValue"
                  type="number"
                  placeholder="e.g. 200 — only trigger for carts above this amount"
                  {...register("triggerConfig.minCartValue", { valueAsNumber: true })}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
                Actions ({actionFields.length})
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  appendAction({
                    actionType: "SEND_MESSAGE",
                    actionConfig: {},
                    orderIndex: actionFields.length,
                  })
                }
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Action
              </Button>
            </div>

            {actionFields.map((field, idx) => {
              const currentActionType = (actionTypes?.[idx]?.actionType ?? "SEND_MESSAGE") as AutomationActionType;

              return (
                <div
                  key={field.id}
                  className="rounded-xl border border-outline-variant/15 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] font-medium text-on-surface-variant">
                      Action {idx + 1}
                    </span>
                    {actionFields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeAction(idx)}
                        className="p-1 rounded text-on-surface-variant/40 hover:text-error transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <Label>Action Type</Label>
                    <select
                      {...register(`actions.${idx}.actionType`)}
                      className="mt-1 w-full rounded-xl border border-outline-variant/20 bg-surface-container-low px-3 py-2.5 text-[14px] text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      {ACTION_TYPES.map((a) => (
                        <option key={a.value} value={a.value}>
                          {a.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Action-specific config fields */}
                  <ActionConfigFields
                    idx={idx}
                    actionType={currentActionType}
                    register={register}
                    setValue={setValue}
                    getValues={getValues}
                  />

                  <div>
                    <Label>Delay (seconds)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      {...register(`actions.${idx}.delaySeconds`, { valueAsNumber: true })}
                    />
                  </div>
                </div>
              );
            })}

            {errors.actions?.message && (
              <p className="text-[12px] text-error">{errors.actions.message}</p>
            )}
          </div>

          {/* Advanced Settings */}
          <div className="rounded-xl border border-outline-variant/15 p-4 space-y-3">
            <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide">
              Advanced Settings
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Input
                  id="priority"
                  type="number"
                  placeholder="0"
                  {...register("priority", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="maxExecutionsPerContact">Max Exec / Contact</Label>
                <Input
                  id="maxExecutionsPerContact"
                  type="number"
                  placeholder="0 (unlimited)"
                  {...register("maxExecutionsPerContact", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label htmlFor="cooldownSeconds">Cooldown (s)</Label>
                <Input
                  id="cooldownSeconds"
                  type="number"
                  placeholder="0"
                  {...register("cooldownSeconds", { valueAsNumber: true })}
                />
              </div>
            </div>
          </div>

          {/* Product */}
          <ProductSelectField
            value={productId}
            onChange={setProductId}
            onBeforeRedirect={onClose}
          />

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2 pb-2">
            <Button type="button" variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" loading={createRule.isPending}>
              Create Rule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
