"use client";

import { useState, useMemo, useEffect } from "react";
import {
  X, FileText, Search, ExternalLink, ChevronDown,
  Megaphone, MessageSquare, Users, Clock, Wifi,
  Package, ScanSearch, Tag, Smartphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateCampaign, useExecuteCampaign, usePreviewAudience } from "@/hooks/use-campaigns";
import { ProductSelectField } from "@/components/ui/product-select-field";
import {
  createCampaignSchema,
  type CreateCampaignFormData,
} from "@/lib/validations/campaigns";
import type { MessageType, CampaignAudienceType } from "@/lib/types/campaigns";
import { useTemplates } from "@/hooks/use-templates";
import { useOrgTags } from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";
import { useScrapeRuns } from "@/hooks/use-lead-scraper";
import type { MessageTemplate } from "@/lib/types/templates";
import { IconButton } from "@/components/ui/icon-button";
import { CampaignCapacityNotice } from "@/components/whatsapp/account-health";
import { WhatsAppPhonePreview } from "@/components/whatsapp/whatsapp-phone-preview";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MediaPicker, mediaKindFor } from "@/components/ui/media-picker";
import {
  CONTACT_SOURCES,
  CONTACT_SOURCE_LABELS,
  SCRAPE_SOURCE_LABELS,
} from "@/lib/constants/contact-sources";

const SOURCE_LABELS: Record<string, string> = SCRAPE_SOURCE_LABELS;

/** Templates shown in the picker per scroll step */
const TEMPLATE_PAGE_SIZE = 10;

const MSG_TYPES: { value: MessageType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
  { value: "AUDIO", label: "Audio" },
];

/** Placeholders the backend fills per contact; anything else must be filled in here */
const CONTACT_PLACEHOLDERS = new Set([
  "name", "phone", "email", "leadStatus",
  "contact.name", "contact.phone", "contact.email", "contact.leadStatus",
]);

function customPlaceholders(body: string): string[] {
  const keys = Array.from(body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g), (m) => m[1]);
  return [...new Set(keys.filter((k) => !CONTACT_PLACEHOLDERS.has(k)))];
}

function fillPlaceholders(body: string, values: Record<string, string>): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) =>
    values[key]?.trim() ? values[key].trim() : match,
  );
}

function extractTemplateBody(template: MessageTemplate): string {
  return template.components.find((c) => c.type === "BODY")?.text ?? "";
}

// ─── Reusable styled select ───────────────────────────────────────────────────
function FilterSelect({
  value, onChange, children, className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative max-lg:max-w-full ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none text-label bg-surface-container border border-outline-variant/20 rounded-lg pl-3 pr-7 py-1.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-on-surface-variant" />
    </div>
  );
}

// ─── Section heading ──────────────────────────────────────────────────────────
function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-on-surface-variant/60">{icon}</span>
      <p className="text-caption font-semibold text-on-surface-variant uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  sessions: { id: string; name: string; status: string }[];
  /** Opens with a filtered audience, e.g. a contact source group */
  initialAudienceFilters?: CreateCampaignFormData["audienceFilters"];
}

export function CreateCampaignModal({ open, onClose, sessions, initialAudienceFilters }: CreateCampaignModalProps) {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const executeCampaign = useExecuteCampaign();
  const previewAudience = usePreviewAudience();

  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled" | "draft">("immediate");
  const [productId, setProductId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  // Templates render a page at a time; scrolling near the end shows the next page
  const [visibleTemplates, setVisibleTemplates] = useState(TEMPLATE_PAGE_SIZE);

  const { data: templates, isLoading: templatesLoading } = useTemplates();
  const { data: orgTags } = useOrgTags();
  const { data: products } = useProducts();
  const { data: scrapeRunsData } = useScrapeRuns({ take: 50 });

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors },
  } = useForm<CreateCampaignFormData>({
    resolver: zodResolver(createCampaignSchema),
    defaultValues: {
      messageType: "TEXT",
      audienceType: "ALL",
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  });

  // With a single connected number there is nothing to choose; preselect it
  const onlySessionId = sessions.length === 1 ? sessions[0].id : null;
  useEffect(() => {
    if (open && onlySessionId) setValue("sessionId", onlySessionId);
  }, [open, onlySessionId, setValue]);

  useEffect(() => {
    if (!open || !initialAudienceFilters) return;
    setValue("audienceType", "FILTERED", { shouldValidate: true });
    setValue("audienceFilters", initialAudienceFilters);
  }, [open, initialAudienceFilters, setValue]);

  const messageType = watch("messageType") as MessageType;
  const audienceType = watch("audienceType") as CampaignAudienceType;
  const messageBody = watch("messageBody") || "";
  const audienceFilters = watch("audienceFilters");
  const mediaUrl = watch("mediaUrl");
  const sessionId = watch("sessionId");
  const senderName = sessions.find((s) => s.id === sessionId)?.name;

  // Template placeholders like {{lead.service}} aren't contact fields — the
  // user fills them once for the whole campaign
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({});
  const extraPlaceholders = useMemo(() => customPlaceholders(messageBody), [messageBody]);
  const unfilledPlaceholders = extraPlaceholders.filter((k) => !placeholderValues[k]?.trim());

  const filteredTemplates = useMemo(() => {
    if (!templates) return [];
    if (!templateSearch.trim()) return templates;
    const q = templateSearch.toLowerCase();
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q),
    );
  }, [templates, templateSearch]);

  function toggleFilter(key: "leadStatuses" | "sources", value: string) {
    const current = audienceFilters?.[key] ?? [];
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue("audienceFilters", { ...audienceFilters, [key]: next.length ? next : undefined });
  }

  // "Send now" goes out to the whole audience at once, so confirm the count first
  const [pendingSend, setPendingSend] = useState<{ data: CreateCampaignFormData; recipients: number | null } | null>(null);

  async function onSubmit(data: CreateCampaignFormData) {
    if (unfilledPlaceholders.length > 0) return;
    if (scheduleMode !== "immediate") {
      submitCampaign(data);
      return;
    }
    let recipients: number | null = null;
    try {
      const preview = await previewAudience.mutateAsync({
        audienceType: data.audienceType,
        audienceFilters: data.audienceType === "FILTERED" ? data.audienceFilters : undefined,
      });
      recipients = preview.estimatedRecipients ?? null;
    } catch {
      // Still let them confirm without a count
    }
    setPendingSend({ data, recipients });
  }

  function submitCampaign(data: CreateCampaignFormData) {
    const isScheduled = scheduleMode === "scheduled" && !!data.scheduledAt;
    createCampaign.mutate(
      {
        ...data,
        description: data.description || undefined,
        messageBody: data.messageBody ? fillPlaceholders(data.messageBody, placeholderValues) : undefined,
        mediaUrl: data.mediaUrl || undefined,
        mediaMimeType: data.mediaMimeType || undefined,
        scheduledAt: isScheduled ? data.scheduledAt : undefined,
        productId: productId || undefined,
      },
      {
        onSuccess: ({ campaign: created }) => {
          // The backend saves unscheduled campaigns as drafts; "Send now" starts it right away
          if (scheduleMode === "immediate") executeCampaign.mutate(created.id);
          reset();
          setScheduleMode("immediate");
          setProductId("");
          setSelectedTemplate(null);
          setTemplateSearch("");
          setShowTemplatePicker(false);
          setPlaceholderValues({});
          setPendingSend(null);
          onClose();
          router.push(`/campaigns/${created.id}`);
        },
      },
    );
  }

  const completedRuns = scrapeRunsData?.runs.filter((r) => r.status === "COMPLETED") ?? [];

  return (
    <>
    <Modal
      open={open}
      onClose={onClose}
      dismissible={!pendingSend}
      aria-label="New Campaign"
      className="max-w-4xl xl:max-w-6xl border border-outline-variant/15 flex flex-col max-h-[90vh] overflow-hidden"
    >
      {() => (
      <>

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0 max-lg:px-4 max-lg:pt-5 max-lg:pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </span>
            <h2 className="text-title-sm font-semibold text-on-surface">New Campaign</h2>
          </div>
          <IconButton size="sm"
            onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        {/* Phones: one column that scrolls up and down; desktop: side-by-side panels */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0 max-lg:block max-lg:min-w-0 max-lg:overflow-y-auto max-lg:overflow-x-hidden max-lg:overscroll-contain">

          {/* LEFT PANEL — Campaign details + Message content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 border-r border-outline-variant/10 max-lg:min-w-0 max-lg:overflow-visible max-lg:border-r-0 max-lg:px-4 max-lg:pb-3">

            <CampaignCapacityNotice />

            {/* Campaign name + description */}
            <div className="space-y-3">
              <SectionHeading icon={<Megaphone className="h-3.5 w-3.5" />} label="Details" />
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
                  placeholder="Brief description…"
                  rows={2}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-on-surface-variant/40"
                  {...register("description")}
                />
              </div>
            </div>

            {/* Message content */}
            <div className="space-y-3">
              <SectionHeading icon={<MessageSquare className="h-3.5 w-3.5" />} label="Message" />

              {/* Type pills */}
              <div>
                <Label>Type</Label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {MSG_TYPES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        if (value === messageType) return;
                        setValue("messageType", value, { shouldValidate: true });
                        // A file picked for one type doesn't fit another
                        setValue("mediaUrl", "");
                        setValue("mediaMimeType", "");
                      }}
                      className={`px-3 py-1.5 rounded-lg text-label font-medium transition-colors border ${
                        messageType === value
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container border-transparent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template picker */}
              <div>
                <Label>
                  WhatsApp Template{" "}
                  <span className="font-normal text-on-surface-variant/50">(optional)</span>
                </Label>

                {selectedTemplate ? (
                  <div className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/30 bg-primary/5 mt-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-body font-medium text-on-surface truncate">{selectedTemplate.name}</span>
                      <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">{selectedTemplate.language}</span>
                      {selectedTemplate.category && (
                        <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">{selectedTemplate.category}</span>
                      )}
                    </div>
                    <IconButton size="xs" variant="danger" type="button" onClick={() => setSelectedTemplate(null)} aria-label="Remove">
                      <X className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setShowTemplatePicker((v) => !v);
                      setVisibleTemplates(TEMPLATE_PAGE_SIZE);
                    }}
                    className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant/15 bg-surface-container-low text-body text-on-surface-variant/60 hover:bg-surface-container transition-colors text-left"
                  >
                    <FileText className="h-4 w-4 shrink-0" />
                    Select a template…
                  </button>
                )}

                {showTemplatePicker && !selectedTemplate && (
                  <div className="mt-1 rounded-xl border border-outline-variant/15 bg-surface-container-lowest shadow-lg overflow-hidden">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-outline-variant/10">
                      <Search className="h-3.5 w-3.5 text-on-surface-variant/40 shrink-0" />
                      <input
                        autoFocus
                        value={templateSearch}
                        onChange={(e) => {
                          setTemplateSearch(e.target.value);
                          setVisibleTemplates(TEMPLATE_PAGE_SIZE);
                        }}
                        placeholder="Search templates…"
                        className="flex-1 bg-transparent text-body text-on-surface outline-none placeholder:text-on-surface-variant/40"
                      />
                    </div>
                    <div
                      className="max-h-[260px] overflow-y-auto"
                      onScroll={(e) => {
                        const el = e.currentTarget;
                        const nearEnd = el.scrollTop + el.clientHeight >= el.scrollHeight - 40;
                        if (nearEnd && visibleTemplates < filteredTemplates.length) {
                          setVisibleTemplates((n) => n + TEMPLATE_PAGE_SIZE);
                        }
                      }}
                    >
                      {templatesLoading ? (
                        <p className="text-label text-center text-on-surface-variant py-4">Loading…</p>
                      ) : filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                          <FileText className="h-6 w-6 text-on-surface-variant/30" />
                          <p className="text-body text-on-surface-variant">
                            {templateSearch.trim() ? "No templates match" : "No templates yet"}
                          </p>
                          {!templateSearch.trim() && (
                            <button type="button" onClick={() => window.open("/settings/templates", "_blank", "noopener")} className="flex items-center gap-1.5 text-label text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" /> Create a template
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredTemplates.slice(0, visibleTemplates).map((tpl) => {
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
                                <span className="text-body font-medium text-on-surface">{tpl.name}</span>
                                <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">{tpl.language}</span>
                                {tpl.category && (
                                  <span className="text-caption bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">{tpl.category}</span>
                                )}
                              </div>
                              <p className="text-label text-on-surface-variant/60 truncate">{body || "—"}</p>
                            </button>
                          );
                        })
                      )}
                    </div>
                    {filteredTemplates.length > TEMPLATE_PAGE_SIZE && (
                      <p className="px-3 py-2 text-caption text-on-surface-variant/50 border-t border-outline-variant/10 text-center">
                        {Math.min(visibleTemplates, filteredTemplates.length)} of {filteredTemplates.length}
                        {visibleTemplates < filteredTemplates.length && " — scroll for more"}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Message body */}
              <div>
                <Label htmlFor="messageBody">Message Body</Label>
                <textarea
                  id="messageBody"
                  placeholder={`Type your message… Use {{name}} for personalization`}
                  rows={5}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-on-surface-variant/40"
                  {...register("messageBody")}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-caption text-on-surface-variant/50">{"{{name}}"}, {"{{phone}}"}</p>
                  <p className="text-caption text-on-surface-variant/50 tabular-nums">{messageBody.length} / 4,096</p>
                </div>
                {errors.messageBody && (
                  <p className="text-label text-error mt-1">{errors.messageBody.message}</p>
                )}
              </div>

              {extraPlaceholders.length > 0 && (
                <div className="space-y-2 rounded-xl bg-surface-container-low p-3">
                  <p className="text-label font-medium text-on-surface">
                    Fill in the template details
                  </p>
                  <p className="text-caption text-on-surface-variant">
                    The same value goes to every recipient.
                  </p>
                  {extraPlaceholders.map((key) => (
                    <div key={key}>
                      <Label htmlFor={`ph-${key}`}>{key.replace(/^lead\./, "").replace(/_/g, " ")}</Label>
                      <Input
                        id={`ph-${key}`}
                        placeholder={`Value for {{${key}}}`}
                        value={placeholderValues[key] ?? ""}
                        onChange={(e) => setPlaceholderValues((prev) => ({ ...prev, [key]: e.target.value }))}
                      />
                    </div>
                  ))}
                  {unfilledPlaceholders.length > 0 && (
                    <p className="text-caption text-error">
                      Fill in all {unfilledPlaceholders.length} field{unfilledPlaceholders.length !== 1 ? "s" : ""} — otherwise contacts would see the raw {"{{…}}"} text.
                    </p>
                  )}
                </div>
              )}

              {messageType !== "TEXT" && (
                <div>
                  <Label htmlFor="mediaUrl">Media *</Label>
                  <MediaPicker
                    id="mediaUrl"
                    kind={mediaKindFor(messageType)}
                    value={mediaUrl ?? ""}
                    error={errors.mediaUrl?.message}
                    onChange={(url, media) => {
                      setValue("mediaUrl", url, { shouldValidate: true });
                      setValue("mediaMimeType", media?.mimeType ?? "");
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE PANEL — Audience, Session, Product, Scheduling */}
          <div className="w-[380px] shrink-0 overflow-y-auto px-6 py-5 space-y-6 xl:border-r xl:border-outline-variant/10 max-lg:w-full max-lg:min-w-0 max-lg:overflow-visible max-lg:px-4 max-lg:pt-3 max-lg:border-t max-lg:border-outline-variant/10">

            {/* Audience */}
            <div>
              <SectionHeading icon={<Users className="h-3.5 w-3.5" />} label="Audience" />

              {/* ALL / FILTERED toggle */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(
                  [
                    { value: "ALL", title: "All Contacts", desc: "Everyone active" },
                    { value: "FILTERED", title: "Filtered", desc: "Specific segment" },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setValue("audienceType", opt.value, { shouldValidate: true })}
                    className={`p-2.5 rounded-xl text-left transition-colors border max-lg:min-w-0 ${
                      audienceType === opt.value
                        ? "border-primary/50 bg-primary/5"
                        : "border-outline-variant/15 bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <p className="text-label font-medium text-on-surface">{opt.title}</p>
                    <p className="text-caption text-on-surface-variant/60">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* FILTERED filters */}
              {audienceType === "FILTERED" && (
                <div className="space-y-4 p-3 rounded-xl border border-outline-variant/15 bg-surface-container-low">

                  {/* Lead Status */}
                  <div>
                    <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Lead Status</p>
                    <div className="flex flex-wrap gap-1">
                      {(["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"] as const).map((s) => {
                        const active = audienceFilters?.leadStatuses?.includes(s);
                        return (
                          <button key={s} type="button" onClick={() => toggleFilter("leadStatuses", s)}
                            className={`px-2 py-0.5 rounded-md text-caption font-medium border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source */}
                  <div>
                    <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Source</p>
                    <div className="flex flex-wrap gap-1">
                      {CONTACT_SOURCES.map((s) => {
                        const active = audienceFilters?.sources?.includes(s);
                        return (
                          <button key={s} type="button" onClick={() => toggleFilter("sources", s)}
                            className={`px-2 py-0.5 rounded-md text-caption font-medium border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                            {CONTACT_SOURCE_LABELS[s]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Tags</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <FilterSelect
                        value=""
                        onChange={(id) => {
                          if (!id) return;
                          const current = audienceFilters?.tagIds ?? [];
                          if (!current.includes(id)) {
                            setValue("audienceFilters", { ...audienceFilters, tagIds: [...current, id] });
                          }
                        }}
                      >
                        <option value="">+ Add tag</option>
                        {(orgTags ?? []).filter((t) => !(audienceFilters?.tagIds ?? []).includes(t.id)).map((t) => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </FilterSelect>
                      {(audienceFilters?.tagIds ?? []).map((tagId) => {
                        const tag = orgTags?.find((t) => t.id === tagId);
                        return (
                          <span key={tagId} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-caption text-primary font-medium">
                            <Tag className="h-2.5 w-2.5" />
                            {tag?.name ?? tagId}
                            <IconButton size="xs" type="button" onClick={() => setValue("audienceFilters", { ...audienceFilters, tagIds: (audienceFilters?.tagIds ?? []).filter((id) => id !== tagId) })} className="hover:bg-primary/20" aria-label="Close">
                              <X className="h-2.5 w-2.5" />
                            </IconButton>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Products */}
                  {products && products.length > 0 && (
                    <div>
                      <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Products</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <FilterSelect
                          value=""
                          onChange={(id) => {
                            if (!id) return;
                            const current = audienceFilters?.productIds ?? [];
                            if (!current.includes(id)) {
                              setValue("audienceFilters", { ...audienceFilters, productIds: [...current, id] });
                            }
                          }}
                        >
                          <option value="">+ Add product</option>
                          {(products ?? []).filter((p) => p.status === "ACTIVE" && !(audienceFilters?.productIds ?? []).includes(p.id)).map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </FilterSelect>
                        {(audienceFilters?.productIds ?? []).map((pid) => {
                          const product = products?.find((p) => p.id === pid);
                          return (
                            <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-caption text-secondary font-medium">
                              {product?.name ?? pid}
                              <IconButton size="xs" type="button" onClick={() => setValue("audienceFilters", { ...audienceFilters, productIds: (audienceFilters?.productIds ?? []).filter((id) => id !== pid) })} className="hover:bg-secondary/20" aria-label="Close">
                                <X className="h-2.5 w-2.5" />
                              </IconButton>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Scraper Run */}
                  {completedRuns.length > 0 && (
                    <div>
                      <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">From Scraper Run</p>
                      <FilterSelect
                        value={audienceFilters?.scrapeRunId ?? ""}
                        onChange={(v) => setValue("audienceFilters", { ...audienceFilters, scrapeRunId: v || undefined })}
                      >
                        <option value="">All contacts</option>
                        {completedRuns.map((r) => (
                          <option key={r.id} value={r.id}>
                            {SOURCE_LABELS[r.source] ?? r.source} — &quot;{r.keywords}&quot; ({r.importedCount > 0 ? `${r.importedCount} imported` : `${r.resultCount} found`})
                          </option>
                        ))}
                      </FilterSelect>
                    </div>
                  )}

                  {/* Quick filters row */}
                  <div>
                    <p className="text-caption font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Quick Filters</p>
                    <div className="flex flex-wrap gap-1.5">
                      <FilterSelect
                        value={audienceFilters?.hasPhone === true ? "yes" : audienceFilters?.hasPhone === false ? "no" : ""}
                        onChange={(v) => setValue("audienceFilters", { ...audienceFilters, hasPhone: v === "yes" ? true : v === "no" ? false : undefined })}
                      >
                        <option value="">Phone: All</option>
                        <option value="yes">Has phone</option>
                        <option value="no">No phone</option>
                      </FilterSelect>

                      <FilterSelect
                        value={audienceFilters?.hasWebsite === true ? "yes" : audienceFilters?.hasWebsite === false ? "no" : ""}
                        onChange={(v) => setValue("audienceFilters", { ...audienceFilters, hasWebsite: v === "yes" ? true : v === "no" ? false : undefined })}
                      >
                        <option value="">Website: All</option>
                        <option value="yes">Has website</option>
                        <option value="no">No website</option>
                      </FilterSelect>

                      <FilterSelect
                        value={audienceFilters?.dateAdded ?? ""}
                        onChange={(v) => setValue("audienceFilters", { ...audienceFilters, dateAdded: (v as "last_7d" | "last_30d" | "last_90d") || undefined })}
                      >
                        <option value="">Added: Any time</option>
                        <option value="last_7d">Last 7 days</option>
                        <option value="last_30d">Last 30 days</option>
                        <option value="last_90d">Last 90 days</option>
                      </FilterSelect>

                      {audienceFilters?.scrapeRunId && (
                        <FilterSelect
                          value={audienceFilters?.minRating?.toString() ?? ""}
                          onChange={(v) => setValue("audienceFilters", { ...audienceFilters, minRating: v ? Number(v) : undefined })}
                        >
                          <option value="">Rating: Any</option>
                          <option value="3">Rating 3.0+</option>
                          <option value="3.5">Rating 3.5+</option>
                          <option value="4">Rating 4.0+</option>
                          <option value="4.5">Rating 4.5+</option>
                        </FilterSelect>
                      )}
                    </div>
                  </div>

                  {/* No filters hint */}
                  {!audienceFilters?.leadStatuses?.length &&
                   !audienceFilters?.sources?.length &&
                   !audienceFilters?.tagIds?.length &&
                   !audienceFilters?.productIds?.length &&
                   !audienceFilters?.scrapeRunId &&
                   audienceFilters?.hasPhone === undefined &&
                   audienceFilters?.hasWebsite === undefined &&
                   !audienceFilters?.dateAdded && (
                    <p className="text-caption text-on-surface-variant/40 italic">
                      Select filters above to narrow your audience.
                    </p>
                  )}
                </div>
              )}

              {/* Preview */}
              <div className="flex items-center gap-3 mt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    previewAudience.mutate({
                      audienceType,
                      audienceFilters: audienceType === "FILTERED" ? audienceFilters : undefined,
                    })
                  }
                  loading={previewAudience.isPending}
                >
                  Preview Audience
                </Button>
                {previewAudience.data && (
                  <span className="text-label text-on-surface-variant">
                    ~<span className="font-semibold text-on-surface">{(previewAudience.data.estimatedRecipients ?? 0).toLocaleString()}</span> recipients
                  </span>
                )}
              </div>
            </div>

            {/* WhatsApp Session */}
            <div>
              <SectionHeading icon={<Wifi className="h-3.5 w-3.5" />} label="Send from" />
              {sessions.length === 0 ? (
                <div className="rounded-xl bg-warning-container px-4 py-3 text-label text-warning">
                  No WhatsApp number is connected.{" "}
                  {/* New tab so the campaign being written isn't lost */}
                  <a href="/settings/whatsapp" target="_blank" rel="noopener noreferrer" className="font-medium underline hover:text-on-surface">
                    Connect WhatsApp
                  </a>
                  , then come back and pick it here.
                </div>
              ) : (
                <select
                  {...register("sessionId")}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-body text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40"
                >
                  {sessions.length > 1 && <option value="">Choose a WhatsApp number</option>}
                  {sessions.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
              {errors.sessionId && (
                <p className="text-label text-error mt-1">{errors.sessionId.message}</p>
              )}
            </div>

            {/* Product (optional) */}
            <div>
              <SectionHeading icon={<Package className="h-3.5 w-3.5" />} label="Product (Optional)" />
              <ProductSelectField value={productId} onChange={setProductId} onBeforeRedirect={onClose} />
            </div>

            {/* Scheduling */}
            <div>
              <SectionHeading icon={<Clock className="h-3.5 w-3.5" />} label="Scheduling" />
              <div className="flex gap-2 mb-3 max-lg:gap-1.5">
                {([
                  { value: "immediate", label: "Send now" },
                  { value: "scheduled", label: "Schedule" },
                  { value: "draft", label: "Save as draft" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleMode(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-label font-medium transition-colors border max-lg:min-w-0 max-lg:px-1.5 max-lg:min-h-11 ${
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
                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <Label htmlFor="scheduledAt">Date & Time</Label>
                    <Input id="scheduledAt" type="datetime-local" error={errors.scheduledAt?.message} {...register("scheduledAt")} />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Input id="timezone" placeholder="UTC" {...register("timezone")} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT PANEL — what the contact sees */}
          <div className="hidden xl:flex w-[320px] shrink-0 overflow-y-auto flex-col items-center px-6 py-5 bg-surface-container-lowest">
            <div className="self-stretch">
              <SectionHeading icon={<Smartphone className="h-3.5 w-3.5" />} label="Preview" />
            </div>
            <WhatsAppPhonePreview
              senderName={senderName}
              messages={[{
                key: "msg",
                body: fillPlaceholders(messageBody, placeholderValues),
                messageType,
                mediaUrl,
              }]}
            />
          </div>
        </form>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <ModalFooter className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest max-lg:flex-wrap max-lg:px-4 max-lg:pt-3">
          {createCampaign.isError && (
            <p className="text-label text-error flex-1 max-lg:basis-full">
              {(createCampaign.error as Error)?.message || "Failed to create campaign"}
            </p>
          )}
          <div className="flex gap-2 ml-auto max-lg:ml-0 max-lg:w-full">
            <Button type="button" variant="secondary" onClick={onClose} className="max-lg:flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              form="campaign-form"
              loading={createCampaign.isPending || previewAudience.isPending}
              onClick={handleSubmit(onSubmit)}
              className="max-lg:flex-1"
            >
              {scheduleMode === "immediate" ? "Create & send" : scheduleMode === "scheduled" ? "Schedule campaign" : "Save draft"}
            </Button>
          </div>
        </ModalFooter>
      </>
      )}
    </Modal>

    <ConfirmDialog
      open={!!pendingSend}
      title="Send this campaign now?"
      message={
        pendingSend?.recipients != null
          ? `It goes out to about ${pendingSend.recipients.toLocaleString()} contact${pendingSend.recipients === 1 ? "" : "s"} right away. You can pause it from the campaign page.`
          : "It goes out to your whole audience right away. You can pause it from the campaign page."
      }
      confirmLabel="Send now"
      variant="warning"
      loading={createCampaign.isPending}
      onCancel={() => setPendingSend(null)}
      onConfirm={() => pendingSend && submitCampaign(pendingSend.data)}
    />
    </>
  );
}
