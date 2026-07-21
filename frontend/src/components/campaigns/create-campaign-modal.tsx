"use client";

import { useState, useMemo } from "react";
import {
  X, FileText, Search, ExternalLink, ChevronDown,
  Megaphone, MessageSquare, Users, Clock, Wifi,
  Package, ScanSearch, Tag,
} from "lucide-react";
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
import { useOrgTags } from "@/hooks/use-contacts";
import { useProducts } from "@/hooks/use-products";
import { useScrapeRuns } from "@/hooks/use-lead-scraper";
import type { MessageTemplate } from "@/lib/types/templates";

const SOURCE_LABELS: Record<string, string> = {
  GOOGLE_MAPS: "Google Maps",
  UPWORK_JOBS: "Upwork",
  FREELANCER_IN: "Freelancer.in",
  TRUELANCER: "Truelancer",
  LINKEDIN_JOBS: "LinkedIn Jobs",
};

const MSG_TYPES: { value: MessageType; label: string }[] = [
  { value: "TEXT", label: "Text" },
  { value: "IMAGE", label: "Image" },
  { value: "VIDEO", label: "Video" },
  { value: "DOCUMENT", label: "Document" },
  { value: "AUDIO", label: "Audio" },
];

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
    <div className={`relative ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none text-xs bg-surface-container border border-outline-variant/20 rounded-lg pl-3 pr-7 py-1.5 text-on-surface focus:outline-none focus:border-primary cursor-pointer"
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
      <p className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-widest">
        {label}
      </p>
    </div>
  );
}

interface CreateCampaignModalProps {
  open: boolean;
  onClose: () => void;
  sessions: { id: string; name: string; status: string }[];
}

export function CreateCampaignModal({ open, onClose, sessions }: CreateCampaignModalProps) {
  const router = useRouter();
  const createCampaign = useCreateCampaign();
  const previewAudience = usePreviewAudience();

  const [scheduleMode, setScheduleMode] = useState<"immediate" | "scheduled">("immediate");
  const [productId, setProductId] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [templateSearch, setTemplateSearch] = useState("");
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

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

  const messageType = watch("messageType") as MessageType;
  const audienceType = watch("audienceType") as CampaignAudienceType;
  const messageBody = watch("messageBody") || "";
  const audienceFilters = watch("audienceFilters");

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

  function onSubmit(data: CreateCampaignFormData) {
    const isScheduled = scheduleMode === "scheduled" && !!data.scheduledAt;
    createCampaign.mutate(
      {
        ...data,
        description: data.description || undefined,
        messageBody: data.messageBody || undefined,
        mediaUrl: data.mediaUrl || undefined,
        mediaMimeType: data.mediaMimeType || undefined,
        scheduledAt: isScheduled ? data.scheduledAt : undefined,
        productId: productId || undefined,
      },
      {
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
      },
    );
  }

  if (!open) return null;

  const completedRuns = scrapeRunsData?.runs.filter((r) => r.status === "COMPLETED") ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal — two-column layout */}
      <div className="relative w-full max-w-4xl rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-2xl flex flex-col max-h-[90vh] my-auto">

        {/* ── Top bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10">
              <Megaphone className="h-4 w-4 text-primary" />
            </span>
            <h2 className="text-[16px] font-semibold text-on-surface">New Campaign</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ────────────────────────────────────────────────────────── */}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 min-h-0">

          {/* LEFT PANEL — Campaign details + Message content */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 border-r border-outline-variant/10">

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
                  className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[13px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-on-surface-variant/40"
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
                      onClick={() => setValue("messageType", value, { shouldValidate: true })}
                      className={`px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors border ${
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
                      <span className="text-[13px] font-medium text-on-surface truncate">{selectedTemplate.name}</span>
                      <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">{selectedTemplate.language}</span>
                      {selectedTemplate.category && (
                        <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant shrink-0">{selectedTemplate.category}</span>
                      )}
                    </div>
                    <button type="button" onClick={() => setSelectedTemplate(null)} className="p-1 rounded text-on-surface-variant hover:text-error transition-colors shrink-0">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowTemplatePicker((v) => !v)}
                    className="mt-1 w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-outline-variant/15 bg-surface-container-low text-[13px] text-on-surface-variant/60 hover:bg-surface-container transition-colors text-left"
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
                        onChange={(e) => setTemplateSearch(e.target.value)}
                        placeholder="Search templates…"
                        className="flex-1 bg-transparent text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/40"
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {templatesLoading ? (
                        <p className="text-xs text-center text-on-surface-variant py-4">Loading…</p>
                      ) : filteredTemplates.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-5 px-4 text-center">
                          <FileText className="h-6 w-6 text-on-surface-variant/30" />
                          <p className="text-[13px] text-on-surface-variant">
                            {templateSearch.trim() ? "No templates match" : "No templates yet"}
                          </p>
                          {!templateSearch.trim() && (
                            <button type="button" onClick={() => { onClose(); router.push("/settings/templates"); }} className="flex items-center gap-1.5 text-[12px] text-primary hover:underline">
                              <ExternalLink className="h-3.5 w-3.5" /> Create a template
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
                                <span className="text-[13px] font-medium text-on-surface">{tpl.name}</span>
                                <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">{tpl.language}</span>
                                {tpl.category && (
                                  <span className="text-[11px] bg-surface-container px-1.5 py-0.5 rounded text-on-surface-variant">{tpl.category}</span>
                                )}
                              </div>
                              <p className="text-[12px] text-on-surface-variant/60 truncate">{body || "—"}</p>
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

              {/* Message body */}
              <div>
                <Label htmlFor="messageBody">Message Body</Label>
                <textarea
                  id="messageBody"
                  placeholder={`Type your message… Use {{name}} for personalization`}
                  rows={5}
                  className="w-full rounded-xl bg-surface-container-low px-4 py-3 text-[13px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40 resize-none placeholder:text-on-surface-variant/40"
                  {...register("messageBody")}
                />
                <div className="flex justify-between mt-1">
                  <p className="text-[11px] text-on-surface-variant/50">{"{{name}}"}, {"{{phone}}"}</p>
                  <p className="text-[11px] text-on-surface-variant/50 tabular-nums">{messageBody.length} / 4,096</p>
                </div>
                {errors.messageBody && (
                  <p className="text-[12px] text-error mt-1">{errors.messageBody.message}</p>
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
            </div>
          </div>

          {/* RIGHT PANEL — Audience, Session, Product, Scheduling */}
          <div className="w-[380px] shrink-0 overflow-y-auto px-6 py-5 space-y-6">

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
                    className={`p-2.5 rounded-xl text-left transition-colors border ${
                      audienceType === opt.value
                        ? "border-primary/50 bg-primary/5"
                        : "border-outline-variant/15 bg-surface-container-low hover:bg-surface-container"
                    }`}
                  >
                    <p className="text-[12px] font-medium text-on-surface">{opt.title}</p>
                    <p className="text-[11px] text-on-surface-variant/60">{opt.desc}</p>
                  </button>
                ))}
              </div>

              {/* FILTERED filters */}
              {audienceType === "FILTERED" && (
                <div className="space-y-4 p-3 rounded-xl border border-outline-variant/15 bg-surface-container-low">

                  {/* Lead Status */}
                  <div>
                    <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Lead Status</p>
                    <div className="flex flex-wrap gap-1">
                      {(["NEW", "CONTACTED", "INTERESTED", "CONVERTED", "CLOSED"] as const).map((s) => {
                        const active = audienceFilters?.leadStatuses?.includes(s);
                        return (
                          <button key={s} type="button" onClick={() => toggleFilter("leadStatuses", s)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Source */}
                  <div>
                    <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Source</p>
                    <div className="flex flex-wrap gap-1">
                      {(["WHATSAPP", "MANUAL", "IMPORT", "API"] as const).map((s) => {
                        const active = audienceFilters?.sources?.includes(s);
                        return (
                          <button key={s} type="button" onClick={() => toggleFilter("sources", s)}
                            className={`px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "border-outline-variant/20 text-on-surface-variant hover:bg-surface-container"}`}>
                            {s.charAt(0) + s.slice(1).toLowerCase()}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Tags</p>
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
                          <span key={tagId} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary font-medium">
                            <Tag className="h-2.5 w-2.5" />
                            {tag?.name ?? tagId}
                            <button type="button" onClick={() => setValue("audienceFilters", { ...audienceFilters, tagIds: (audienceFilters?.tagIds ?? []).filter((id) => id !== tagId) })} className="rounded-full p-0.5 hover:bg-primary/20">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Products */}
                  {products && products.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Products</p>
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
                            <span key={pid} className="inline-flex items-center gap-1 rounded-full bg-secondary/10 px-2 py-0.5 text-[11px] text-secondary font-medium">
                              {product?.name ?? pid}
                              <button type="button" onClick={() => setValue("audienceFilters", { ...audienceFilters, productIds: (audienceFilters?.productIds ?? []).filter((id) => id !== pid) })} className="rounded-full p-0.5 hover:bg-secondary/20">
                                <X className="h-2.5 w-2.5" />
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Scraper Run */}
                  {completedRuns.length > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">From Scraper Run</p>
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
                    <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-widest mb-1.5">Quick Filters</p>
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
                          <option value="3">⭐ 3.0+</option>
                          <option value="3.5">⭐ 3.5+</option>
                          <option value="4">⭐ 4.0+</option>
                          <option value="4.5">⭐ 4.5+</option>
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
                    <p className="text-[11px] text-on-surface-variant/40 italic">
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
                  <span className="text-[12px] text-on-surface-variant">
                    ~<span className="font-semibold text-on-surface">{(previewAudience.data.estimatedRecipients ?? 0).toLocaleString()}</span> recipients
                  </span>
                )}
              </div>
            </div>

            {/* WhatsApp Session */}
            <div>
              <SectionHeading icon={<Wifi className="h-3.5 w-3.5" />} label="WhatsApp Session" />
              <select
                {...register("sessionId")}
                className="w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-[13px] text-on-surface outline-none focus:bg-surface-container focus:ring-2 focus:ring-primary/40"
              >
                <option value="">Select a session</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.status})</option>
                ))}
              </select>
              {errors.sessionId && (
                <p className="text-[12px] text-error mt-1">{errors.sessionId.message}</p>
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
              <div className="flex gap-2 mb-3">
                {([
                  { value: "immediate", label: "Send Now" },
                  { value: "scheduled", label: "Schedule" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScheduleMode(opt.value)}
                    className={`flex-1 px-3 py-2 rounded-lg text-[12px] font-medium transition-colors border ${
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
        </form>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-outline-variant/10 bg-surface-container-lowest">
          {createCampaign.isError && (
            <p className="text-[12px] text-error flex-1">
              {(createCampaign.error as Error)?.message || "Failed to create campaign"}
            </p>
          )}
          <div className="flex gap-2 ml-auto">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="campaign-form"
              loading={createCampaign.isPending}
              onClick={handleSubmit(onSubmit)}
            >
              Create Campaign
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
