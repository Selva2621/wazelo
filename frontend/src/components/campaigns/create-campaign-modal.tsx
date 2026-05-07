"use client";

import { useState, useMemo } from "react";
import { X, FileText, Search, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCampaign, usePreviewAudience } from "@/hooks/use-campaigns";
import { ProductSelectField } from "@/components/ui/product-select-field";
import {
  createCampaignSchema,
  type CreateCampaignFormData,
} from "@/lib/validations/campaigns";
import type { MessageType, CampaignAudienceType } from "@/lib/types/campaigns";
import { useTemplates } from "@/hooks/use-templates";
import type { MessageTemplate } from "@/lib/types/templates";

function extractTemplateBody(template: MessageTemplate): string {
  return template.components.find((c) => c.type === "BODY")?.text ?? "";
}

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  sessions: { id: string; name: string; status: string }[];
}

export function CreateCampaignModal({
  open,
  onClose,
  sessions,
}: CreateCampaignModalProps) {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const previewAudience = usePreviewAudience();
  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [productId, setProductId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const { data: templates, isLoading: templatesLoading } = useTemplates();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      messageType: "TEXT",
      audienceType: "ALL",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  const messageType = watch("messageType") as MessageType;
  const audienceType = watch("audienceType") as CampaignAudienceType;
  const messageBody = watch("messageBody") || "";
  const audienceFilters = watch("audienceFilters");

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.language.toLowerCase().includes(q),
    );
  }, [templates, templateSearch]);

  function toggleFilter(key: "leadStatuses" | "sources", value: string) {
    const current = audienceFilters?.[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue("audienceFilters", { ...audienceFilters, [key]: next.length ? next : undefined });
  }

  function onSubmit(data: CreateCampaignFormData) {
    const isScheduled = scheduleMode === "scheduled" && !!data.scheduledAt;
    const payload = {
      ...data,
      description: data.description || undefined,
      messageBody: data.messageBody || undefined,
      mediaUrl: data.mediaUrl || undefined,
      mediaMimeType: data.mediaMimeType || undefined,
      scheduledAt: isScheduled ? data.scheduledAt : undefined,
      productId: productId || undefined,
    };

    createCampaign.mutate(payload, {
      onSuccess: ({ campaign: created }) => {
        reset();
        setScheduleMode("immediate");
        setProductId("");
        setSelectedTemplate(null);
        setTemplateSearch("");
        setShowTemplatePicker(false);
        onClose();
        router.push(`/campaigns/${created.id}`);
      },
    });
  }

  function handlePreviewAudience() {
    previewAudience.mutate({
      audienceType,
      audienceFilters: audienceType === "FILTERED" ? audienceFilters : undefined,
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-surface/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-[18px] font-semibold text-on-surface">
            New Campaign
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Campaign Details */}
          <section className="space-y-3">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
              Campaign Details
            </p>
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Welcome Offer 2024"
                error={errors.name?.message}
                {...register("name")}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                placeholder="Brief description of this campaign..."
                rows={2}
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[15px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-on-surface-variant/40"
                {...register("description")}
              />
            </div>
          </section>

          {/* Section 2: Message Content */}
          <section className="space-y-3">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
              Message Content
            </p>

            {/* Message Type */}
            <div>
              <Label>Message Type</Label>
              <div className="flex gap-1.5">
                {(["TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as MessageType[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        setValue("messageType", type, { shouldValidate: true })
                      }
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                        messageType === type
                          ? "bg-primary/20 text-primary border border-primary/30"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border border-transparent"
                      }`}
                    >
                      {type}
                    </button>
                  ),
                )}
              </div>
            </div>

            {/* WhatsApp Template picker */}
            <div>
              <Label>
                WhatsApp Template{" "}
                <span className="font-normal text-on-surface-variant/50">(optional)</span>
              </Label>

              {selectedTemplate ? (
                /* Selected chip */
                <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/30 bg-primary/5 mt-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <span className="text-[13px] font-medium text-on-surface truncate">
                      {selectedTemplate.name}
                    </span>
                    <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">
                      {selectedTemplate.language}
                    </span>
                    {selectedTemplate.category && (
                      <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">
                        {selectedTemplate.category}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedTemplate(null)}
                    className="p-1 rounded text-on-surface-variant hover:text-error transition-colors shrink-0"
                    title="Clear template"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                /* Select button */
                <button
                  type="button"
                  onClick={() => setShowTemplatePicker((v) => !v)}
                  className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant/15 bg-surface-container-low text-[13px] text-on-surface-variant/60 hover:bg-surface-container transition-colors text-left"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Select a template…
                </button>
              )}

              {/* Dropdown list */}
              {showTemplatePicker && !selectedTemplate && (
                <div className="mt-1 rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-lg overflow-hidden">
                  {/* Search */}
                  <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/10">
                    <Search className="h-3.5 w-3.5 text-on-surface-variant/40 shrink-0" />
                    <input
                      autoFocus
                      value={templateSearch}
                      onChange={(e) => setTemplateSearch(e.target.value)}
                      placeholder="Search templates…"
                      className="flex-1 bg-transparent text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/40"
                    />
                  </div>
                  {/* List — shows first 3, search to see more */}
                  <div className="max-h-[220px] overflow-y-auto">
                    {templatesLoading ? (
                      <p className="text-xs text-center text-on-surface-variant py-4">
                        Loading…
                      </p>
                    ) : filteredTemplates.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                        <FileText className="h-6 w-6 text-on-surface-variant/30" />
                        <p className="text-[13px] text-on-surface-variant">
                          {templateSearch.trim() ? "No templates match your search" : "No templates yet"}
                        </p>
                        {!templateSearch.trim() && (
                          <button
                            type="button"
                            onClick={() => { onClose(); router.push("/settings/templates"); }}
                            className="flex items-center gap-1.5 text-[12px] text-primary hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            Create a template
                          </button>
                        )}
                      </div>
                    ) : (
                      (templateSearch.trim() ? filteredTemplates : filteredTemplates.slice(0, 3)).map((tpl) => {
                        const body = extractTemplateBody(tpl);
                        return (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => {
                              setSelectedTemplate(tpl);
                              setValue("messageBody", body, { shouldValidate: true });
                              setShowTemplatePicker(false);
                              setTemplateSearch("");
                            }}
                            className="w-full text-left px-3 py-2.5 hover:bg-surface-container transition-colors border-b border-outline-variant/5 last:border-0"
                          >
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="text-[13px] font-medium text-on-surface">
                                {tpl.name}
                              </span>
                              <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                                {tpl.language}
                              </span>
                              {tpl.category && (
                                <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">
                                  {tpl.category}
                                </span>
                              )}
                            </div>
                            <p className="text-[12px] text-on-surface-variant/60 truncate">
                              {body || "—"}
                            </p>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {!templateSearch.trim() && filteredTemplates.length > 3 && (
                    <p className="px-3 py-2 text-[11px] text-on-surface-variant/50 border-t border-outline-variant/10 text-center">
                      {filteredTemplates.length - 3} more — search to filter
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              <Label htmlFor="messageBody">Message Body</Label>
              <textarea
                id="messageBody"
                placeholder="Type your message here... Use {{name}} for personalization"
                rows={4}
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[15px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-on-surface-variant/40"
                {...register("messageBody")}
              />
              <div className="flex justify-between mt-1">
                <p className="text-[11px] text-on-surface-variant/50">
                  Supports: {"{{name}}"}, {"{{phone}}"}
                </p>
                <p className="text-[11px] text-on-surface-variant/50 tabular-nums">
                  {messageBody.length} / 4,096
                </p>
              </div>
              {errors.messageBody && (
                <p className="text-[12px] text-error mt-1">
                  {errors.messageBody.message}
                </p>
              )}
            </div>

            {messageType !== "TEXT" && (
              <div>
                <Label htmlFor="mediaUrl">Media URL *</Label>
                <Input
                  id="mediaUrl"
                  placeholder="https://example.com/image.jpg"
                  error={errors.mediaUrl?.message}
                  {...register("mediaUrl")}
                />
              </div>
            )}
          </section>

          {/* Section 3: Audience */}
          <section className="space-y-3">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
              Audience
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  {
                    value: "ALL",
                    title: "All Contacts",
                    desc: "Send to all active contacts",
                  },
                  {
                    value: "FILTERED",
                    title: "Filtered",
                    desc: "Target specific segments",
                  },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    setValue("audienceType", opt.value, { shouldValidate: true })
                  }
                  className={`p-3 rounded-xl text-left transition-colors border ${
                    audienceType === opt.value
                      ? "border-primary/50 bg-primary/5"
                      : "border-outline-variant/15 bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  <p className="text-[13px] font-medium text-on-surface">
                    {opt.title}
                  </p>
                  <p className="text-[11px] text-on-surface-variant/60">
                    {opt.desc}
                  </p>
                </button>
              ))}
            </div>

            {audienceType === "FILTERED" && (
              <div className="space-y-3 p-3 rounded-lg border border-outline-variant/15 bg-surface-container-low">
                {/* Lead Status Filter */}
                <div>
                  <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide mb-2">
                    Lead Status
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"] as const).map((s) => {
                      const active = audienceFilters?.leadStatuses?.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleFilter("leadStatuses", s)}
                          className={`px-2.5 py-1 rounded-md text-[12px] font-medium border transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <p className="text-[12px] font-medium text-on-surface-variant uppercase tracking-wide mb-2">
                    Source
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(["WHATSAPP", "MANUAL", "IMPORT", "API"] as const).map((s) => {
                      const active = audienceFilters?.sources?.includes(s);
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => toggleFilter("sources", s)}
                          className={`px-2.5 py-1 rounded-md text-[12px] font-medium border transition-colors ${
                            active
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          {s.charAt(0) + s.slice(1).toLowerCase()}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {!audienceFilters?.leadStatuses?.length && !audienceFilters?.sources?.length && (
                  <p className="text-[11px] text-on-surface-variant/50">
                    Select at least one filter to target specific contacts
                  </p>
                )}
              </div>
            )}

            {previewAudience.data && (
              <p className="text-[12px] text-on-surface-variant">
                Estimated recipients:{" "}
                <span className="font-medium text-on-surface">
                  {(previewAudience.data.estimatedRecipients ?? 0).toLocaleString()}
                </span>
              </p>
            )}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handlePreviewAudience}
              loading={previewAudience.isPending}
            >
              Preview Audience
            </Button>
          </section>

          {/* Section 4: WhatsApp Session */}
          <section className="space-y-3">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
              WhatsApp Session
            </p>
            <div>
              <Label htmlFor="sessionId">Session *</Label>
              <select
                id="sessionId"
                {...register("sessionId")}
                className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[15px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select a session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
              {errors.sessionId && (
                <p className="text-[12px] text-error mt-1">
                  {errors.sessionId.message}
                </p>
              )}
            </div>
          </section>

          {/* Section 5: Product (optional) */}
          <section>
            <ProductSelectField
              value={productId}
              onChange={setProductId}
              onBeforeRedirect={onClose}
            />
          </section>

          {/* Section 6: Scheduling */}
          <section className="space-y-3">
            <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wide">
              Scheduling
            </p>
            <div className="flex gap-3">
              {(
                [
                  { value: "immediate", label: "Send immediately" },
                  { value: "scheduled", label: "Schedule for later" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setScheduleMode(opt.value)}
                  className={`px-4 py-2 rounded-lg text-[13px] font-medium transition-colors border ${
                    scheduleMode === opt.value
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-outline-variant/15 text-on-surface-variant hover:bg-surface-container"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {scheduleMode === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="scheduledAt">Date & Time</Label>
                  <Input
                    id="scheduledAt"
                    type="datetime-local"
                    error={errors.scheduledAt?.message}
                    {...register("scheduledAt")}
                  />
                </div>
                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Input
                    id="timezone"
                    placeholder="UTC"
                    {...register("timezone")}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Error */}
          {createCampaign.isError && (
            <p className="text-[13px] text-error">
              {(createCampaign.error as Error)?.message ||
                "Failed to create campaign"}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={createCampaign.isPending}
              className="flex-1"
            >
              Create Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
