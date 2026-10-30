"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Trash2, Pencil, Package, GripVertical, User, Sparkles, X, ShoppingBag, ShoppingCart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { FilterBar } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, LoadError } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { BottomSheet } from "@/components/ios/bottom-sheet";
import { GroupedSection, ListRow } from "@/components/ios/grouped-list";
import { usePageTitle } from "@/hooks/use-page-title";
import { useIsMobile } from "@/hooks/use-is-mobile";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useGenerateTemplate,
  useRewriteTemplate,
} from "@/hooks/use-templates";
import { useOrgSettings } from "@/hooks/use-settings";
import { useProducts } from "@/hooks/use-products";
import { useProductTerms } from "@/lib/product-terms";
import { listFieldDefinitions, type CustomFieldDefinition } from "@/lib/api/custom-fields";
import { TEMPLATE_STATUS_LABELS, type MessageTemplate } from "@/lib/types/templates";
import { IconButton } from "@/components/ui/icon-button";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";

const CATEGORIES = ["", "MARKETING", "UTILITY", "AUTHENTICATION", "SHOPIFY"] as const;

// Stored as Meta's capitals; shown in sentence case ("MARKETING" → "Marketing")
function categoryLabel(cat: string): string {
  return cat.charAt(0) + cat.slice(1).toLowerCase();
}

const SHOPIFY_TEMPLATE_TYPES: Record<string, string> = {
  order_confirmation: "Order Confirmation",
  order_fulfilled: "Order Fulfilled",
  cart_abandoned: "Cart Abandoned",
  post_purchase: "Post Purchase",
  order_cancelled: "Order Cancelled",
};

function isShopifyTemplate(tpl: MessageTemplate): boolean {
  return tpl.category === "SHOPIFY";
}

function getShopifyType(tpl: MessageTemplate): string | null {
  const ev = tpl.exampleValues as Record<string, string> | null;
  return ev?.shopifyType ?? null;
}
const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "ta", label: "Tamil" },
  { value: "es", label: "Spanish" },
  { value: "ar", label: "Arabic" },
] as const;

const SYSTEM_FIELDS = [
  { fieldName: "name", fieldLabel: "Name" },
  { fieldName: "phone", fieldLabel: "Phone" },
  { fieldName: "email", fieldLabel: "Email" },
  { fieldName: "lead_status", fieldLabel: "Lead Status" },
  { fieldName: "lead_score", fieldLabel: "Lead Score" },
  { fieldName: "source", fieldLabel: "Source" },
];

function extractBody(tpl: MessageTemplate): string {
  return tpl.components.find((c) => c.type === "BODY")?.text ?? "";
}

function getProductId(tpl: MessageTemplate): string | null {
  const ev = tpl.exampleValues as Record<string, string> | null;
  return ev?.productId ?? null;
}

export default function TemplatesPage() {
  usePageTitle("Message Templates");
  const { data: templates, isLoading, isError, refetch } = useTemplates();
  const { data: products } = useProducts();
  const { data: customFields } = useQuery({
    queryKey: ["custom-fields", "contact"],
    queryFn: () => listFieldDefinitions("contact"),
    staleTime: 120_000,
  });
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const generateTemplate = useGenerateTemplate();
  const rewriteTemplate = useRewriteTemplate();
  const { data: orgSettings } = useOrgSettings();
  const isFreelancer = orgSettings?.orgType === "FREELANCER";
  const service = (orgSettings?.freelancerServiceLabel ?? orgSettings?.freelancerService ?? "").trim();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [productId, setProductId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formError, setFormError] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [aiLanguage, setAiLanguage] = useState("en");
  // Phones: the template tapped in the list, shown in a full-height detail sheet
  const [detail, setDetail] = useState<MessageTemplate | null>(null);
  const isMobile = useIsMobile();
  // Stable: BottomSheet re-runs its focus effect whenever onClose changes
  const closeDetail = useCallback(() => setDetail(null), []);

  const allFields = useMemo(() => {
    const custom: { fieldName: string; fieldLabel: string }[] = (customFields ?? []).map((f: CustomFieldDefinition) => ({
      fieldName: f.fieldName,
      fieldLabel: f.fieldLabel,
    }));
    return [...SYSTEM_FIELDS, ...custom];
  }, [customFields]);

  const terms = useProductTerms();
  const productMap = useMemo(() => {
    const map: Record<string, string> = {};
    (products ?? []).forEach((p) => { map[p.id] = p.name; });
    return map;
  }, [products]);

  const filtered = useMemo(() => {
    if (!templates) return [];
    let result = templates;
    if (categoryFilter) result = result.filter((t) => t.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || extractBody(t).toLowerCase().includes(q),
      );
    }
    return result;
  }, [templates, search, categoryFilter]);


  const insertAtCursor = useCallback((variable: string) => {
    const el = textareaRef.current;
    if (!el) {
      setBody((b) => b + variable);
      return;
    }
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newBody = body.slice(0, start) + variable + body.slice(end);
    setBody(newBody);
    requestAnimationFrame(() => {
      el.selectionStart = el.selectionEnd = start + variable.length;
      el.focus();
    });
  }, [body]);

  const resetForm = () => {
    setName("");
    setBody("");
    setCategory("");
    setLanguage("en");
    setProductId("");
    setEditId(null);
    setFormError("");
    setShowForm(false);
  };

  const handleGenerate = () => {
    if (!aiPrompt.trim()) return;
    generateTemplate.mutate(
      { prompt: aiPrompt.trim(), category: aiCategory || undefined, language: aiLanguage },
      {
        onSuccess: (result) => {
          resetForm();
          setName(result.name);
          setBody(result.body);
          setCategory(aiCategory);
          setLanguage(aiLanguage);
          setShowAiModal(false);
          setAiPrompt("");
          setAiCategory("");
          setAiLanguage("en");
          setShowForm(true);
        },
      },
    );
  };

  // Freelancers: reword the message for their own service (AI credits; they review, then save)
  const handleRewrite = () => {
    setFormError("");
    if (!service) {
      setFormError("Add what you do in Settings → Organization first, then try again.");
      return;
    }
    rewriteTemplate.mutate(
      { body: body.trim(), service },
      {
        onSuccess: (r) => setBody(r.body),
        onError: (err) =>
          setFormError(
            (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
              "Couldn't rewrite it right now. Please try again.",
          ),
      },
    );
  };

  const handleSave = () => {
    setFormError("");
    if (!name.trim()) { setFormError("Template name is required."); return; }
    if (name.trim().length > 255) { setFormError("Name must be 255 characters or less."); return; }
    if (!body.trim()) { setFormError("Message body is required."); return; }
    if (body.trim().length > 4096) { setFormError("Message body must be 4096 characters or less."); return; }
    const payload = {
      name: name.trim(),
      body: body.trim(),
      category: category || undefined,
      language,
      productId: productId || undefined,
    };
    if (editId) {
      updateTemplate.mutate(
        { id: editId, ...payload, productId: productId || null },
        { onSuccess: resetForm, onError: (err) => setFormError((err as Error).message || "Failed to save template.") },
      );
    } else {
      createTemplate.mutate(payload, {
        onSuccess: resetForm,
        onError: (err) => setFormError((err as Error).message || "Failed to create template."),
      });
    }
  };

  const startEdit = (tpl: MessageTemplate) => {
    setEditId(tpl.id);
    setName(tpl.name);
    setBody(extractBody(tpl));
    setCategory(tpl.category ?? "");
    setLanguage(tpl.language);
    setProductId(getProductId(tpl) ?? "");
    setShowForm(true);
  };

  const columns: DataTableColumn<MessageTemplate>[] = [
    {
      id: "name",
      header: "Template name",
      skeleton: "avatar",
      cell: (tpl) => {
        const isShopify = isShopifyTemplate(tpl);
        const shopifyType = isShopify ? getShopifyType(tpl) : null;
        const ShopifyIcon = shopifyType === "cart_abandoned" ? ShoppingCart : ShoppingBag;
        return (
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isShopify ? "bg-success/10" : "bg-primary/10"}`}>
              {isShopify
                ? <ShopifyIcon className="h-4 w-4 text-success" />
                : <FileText className="h-4 w-4 text-primary" />
              }
            </div>
            <div>
              <span className="text-body font-medium text-on-surface">
                {tpl.name}
              </span>
              {isShopify && (
                <p className="text-caption text-success/70 leading-none mt-0.5">
                  {shopifyType ? SHOPIFY_TEMPLATE_TYPES[shopifyType] ?? shopifyType : "Shopify"}
                </p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "product",
      header: terms.Singular,
      skeleton: "badge",
      cell: (tpl) => {
        const linkedProductId = getProductId(tpl);
        const linkedProductName = linkedProductId ? productMap[linkedProductId] : null;
        return linkedProductName ? (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-caption text-on-surface-variant border border-outline-variant/15">
            <Package className="h-3 w-3 opacity-60" />
            {linkedProductName}
          </span>
        ) : (
          <span className="text-label text-on-surface-variant/40">—</span>
        );
      },
    },
    {
      id: "category",
      header: "Category",
      skeleton: "badge",
      cell: (tpl) =>
        isShopifyTemplate(tpl) ? (
          <Badge variant="success">
            <ShoppingBag className="h-3 w-3" aria-hidden />
            Shopify
          </Badge>
        ) : tpl.category ? (
          <Badge variant="muted">{categoryLabel(tpl.category)}</Badge>
        ) : (
          <span className="text-label text-on-surface-variant/40">—</span>
        ),
    },
    {
      id: "language",
      header: "Language",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant uppercase",
      cell: (tpl) => tpl.language,
    },
    {
      id: "body",
      header: "Body preview",
      cellClassName: "text-label text-on-surface-variant truncate max-w-[240px]",
      cell: (tpl) => extractBody(tpl) || "—",
    },
    {
      id: "created",
      header: "Created",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant",
      cell: (tpl) =>
        new Date(tpl.createdAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      skeleton: "none",
      cell: (tpl) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton size="xs"
            onClick={() => startEdit(tpl)}
            className="hover:text-primary hover:bg-primary/10"
            title="Edit template" aria-label="Edit template">
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          {isShopifyTemplate(tpl) ? (
            <span
              title="System template — cannot be deleted"
              aria-label="System template — cannot be deleted"
              role="img"
              className="p-1.5 rounded-lg text-on-surface-variant/25 cursor-not-allowed"
            >
              <Lock className="h-3.5 w-3.5" />
            </span>
          ) : (
            <IconButton size="xs" variant="danger"
              onClick={() => setDeleteTarget(tpl)}
              title="Delete template" aria-label="Delete template">
              <Trash2 className="h-3.5 w-3.5" />
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <LoadError what="templates" onRetry={() => refetch()} className="m-6" />;
  }

  // Form pieces shared by the desktop inline form and the phone sheet (only one renders)
  const nameInput = (
    <input
      aria-label="Template name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      placeholder="Template name * (e.g. welcome_offer)"
      autoFocus={!isMobile}
      className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
    />
  );

  const categoryLanguageFields = (
    <div className="grid grid-cols-2 gap-3">
      <select
        aria-label="Category"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        {CATEGORIES.map((c) => (
          <option key={c} value={c}>{c ? categoryLabel(c) : "No category"}</option>
        ))}
      </select>

      <select
        aria-label="Language"
        value={language}
        onChange={(e) => setLanguage(e.target.value)}
        className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
      >
        {LANGUAGES.map((l) => (
          <option key={l.value} value={l.value}>{l.label}</option>
        ))}
      </select>
    </div>
  );

  // Body textarea with drag-drop
  const bodyField = (
    <div>
      <label htmlFor="template-body" className="block text-caption font-medium text-on-surface-variant mb-1.5">
        Message body *
        <span className="ml-2 font-normal opacity-60 max-lg:hidden">— drag fields from the right panel to insert</span>
        <span className="ml-2 font-normal opacity-60 lg:hidden">— tap a field below to insert</span>
      </label>
      <textarea
        id="template-body"
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Hello {{name}}, your order is ready!"
        rows={7}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const variable = e.dataTransfer.getData("text/plain");
          if (variable) insertAtCursor(variable);
        }}
        className={`w-full rounded-lg border px-3 py-2.5 text-body text-on-surface focus:outline-none focus:ring-1 resize-none transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5 ring-1 ring-primary/30"
            : "border-outline-variant/20 bg-surface focus:border-primary focus:ring-primary/30"
        }`}
      />
      <div className="flex items-center justify-between gap-2 mt-1">
        {isFreelancer && body.trim() ? (
          <button
            type="button"
            onClick={handleRewrite}
            disabled={rewriteTemplate.isPending}
            title={service ? `Rewrite for: ${service} (uses AI credits)` : "Add what you do in Settings first"}
            className="inline-flex items-center gap-1 rounded text-label font-medium text-primary hover:underline disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-focus max-lg:min-h-11"
          >
            {rewriteTemplate.isPending ? <Spinner className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
            {rewriteTemplate.isPending ? "Rewriting…" : "Rewrite for my service"}
          </button>
        ) : (
          <span />
        )}
        <p className="text-caption text-on-surface-variant/50 tabular-nums">
          {body.length} / 4,096
        </p>
      </div>
    </div>
  );

  const errorBox = formError ? (
    <p className="text-label text-error bg-error/8 border border-error/15 px-3 py-2 rounded-lg">
      {formError}
    </p>
  ) : null;

  return (
    // Desktop: room around the page, like the other list pages
    <div className="space-y-4 max-lg:px-4 max-lg:pb-4 lg:p-6">
      <MobilePageActions
        primary={{ label: "New template", onClick: () => { resetForm(); setShowForm(true); } }}
        more={[{ label: "Generate with AI", onSelect: () => setShowAiModal(true) }]}
      />
      {/* Header */}
      <PageHeader
        title="Message templates"
        count={templates?.length}
        className="max-lg:hidden"
        actions={
          <>
            {templates && templates.length > 0 && (
              <SearchInput
                aria-label="Search templates"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates"
                className="w-64"
              />
            )}
            <Button variant="secondary" onClick={() => setShowAiModal(true)}>
              <Sparkles className="h-4 w-4 mr-1" /> Generate with AI
            </Button>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New template
            </Button>
          </>
        }
      />

      {/* Create/Edit Form — 2 column layout */}
      {showForm && !isMobile && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-body-lg font-semibold text-on-surface">
              {editId ? "Edit template" : "New template"}
            </h2>
          </div>

          <div className="grid grid-cols-[1fr_280px] divide-x divide-outline-variant max-lg:grid-cols-1 max-lg:divide-x-0 max-lg:divide-y">
            {/* Left: Template fields */}
            <div className="p-5 space-y-3">
              {nameInput}

              {categoryLanguageFields}

              {bodyField}

              {errorBox}

              <div className="flex gap-2 justify-end pt-1">
                <Button variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                  loading={createTemplate.isPending || updateTemplate.isPending}
                >
                  {editId ? "Save changes" : "Create template"}
                </Button>
              </div>
            </div>

            {/* Right: Contact fields + Product selector */}
            <div className="flex flex-col divide-y divide-outline-variant overflow-y-auto max-h-[520px]">
              {/* Contact Fields */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <User className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
                  <p className="text-caption font-semibold text-on-surface">
                    Contact fields
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {allFields.map((field) => {
                    const variable = `{{${field.fieldName}}}`;
                    return (
                      <div
                        key={field.fieldName}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData("text/plain", variable);
                          e.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() => insertAtCursor(variable)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            insertAtCursor(variable);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        title={`Insert ${variable}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface border border-outline-variant outline-none focus-visible:ring-2 focus-visible:ring-focus text-caption text-on-surface-variant cursor-grab active:cursor-grabbing hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors select-none"
                      >
                        <GripVertical className="h-3 w-3 opacity-40 shrink-0" />
                        <span className="font-medium">{field.fieldLabel}</span>
                        <span className="opacity-40 font-mono text-caption">{`{{${field.fieldName}}}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product selector */}
              {products && products.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Package className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
                    <p className="text-caption font-semibold text-on-surface">
                      Link to {terms.singular}
                    </p>
                  </div>
                  <p className="text-caption text-on-surface-variant/60 mb-2">
                    Group this template under a {terms.singular}
                  </p>
                  <div className="space-y-1">
                    {/* No product option */}
                    <button
                      type="button"
                      onClick={() => setProductId("")}
                      aria-pressed={!productId}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-label text-left transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                        !productId
                          ? "border-primary/40 bg-primary/5 text-primary font-medium"
                          : "border-transparent text-on-surface-variant hover:bg-surface"
                      }`}
                    >
                      <span className="text-caption opacity-60">—</span>
                      No {terms.singular}
                    </button>
                    {products
                      .filter((p) => p.status === "ACTIVE")
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProductId(p.id === productId ? "" : p.id)}
                          aria-pressed={productId === p.id}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-label text-left transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                            productId === p.id
                              ? "border-primary/40 bg-primary/5 text-primary font-medium"
                              : "border-transparent text-on-surface-variant hover:bg-surface"
                          }`}
                        >
                          <Package className="h-3 w-3 shrink-0 opacity-60" />
                          {p.name}
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phones: create/edit as a full-height sheet: form first, fields as a sideways row, sticky actions */}
      {isMobile && (
        <Modal
          open={showForm}
          onClose={resetForm}
          dismissible={!(createTemplate.isPending || updateTemplate.isPending)}
          aria-labelledby="template-form-title"
          className="flex h-[calc(100dvh-var(--safe-top)-12px)] flex-col"
        >
          {() => (
            <>
              <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-2">
                <h2 id="template-form-title" className="text-body-lg font-semibold text-on-surface">
                  {editId ? "Edit template" : "New template"}
                </h2>
                {!editId && (
                  <Button variant="secondary" size="sm" onClick={() => setShowAiModal(true)} className="min-h-11">
                    <Sparkles className="h-4 w-4 mr-1" aria-hidden /> Generate with AI
                  </Button>
                )}
              </div>

              <div className="flex-1 space-y-3 px-4 pb-4">
                {nameInput}
                {categoryLanguageFields}
                {bodyField}

                {/* Contact fields: tap to insert at the cursor */}
                <div>
                  <p className="mb-1.5 text-caption font-medium text-on-surface-variant">Contact fields</p>
                  <div className="mobile-scroll-x -mx-4 flex gap-1.5 px-4">
                    {allFields.map((field) => {
                      const variable = `{{${field.fieldName}}}`;
                      return (
                        <button
                          key={field.fieldName}
                          type="button"
                          onClick={() => insertAtCursor(variable)}
                          aria-label={`Insert ${field.fieldLabel}`}
                          className="inline-flex min-h-11 items-center rounded-full border border-outline-variant bg-surface px-3 text-label font-medium text-on-surface-variant outline-none focus-visible:ring-2 focus-visible:ring-focus active:bg-primary/5 active:text-primary"
                        >
                          {field.fieldLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Product link: same values as the desktop picker */}
                {products && products.length > 0 && (
                  <div>
                    <label htmlFor="template-product" className="mb-1.5 block text-caption font-medium text-on-surface-variant">
                      Link to {terms.singular}
                    </label>
                    <select
                      id="template-product"
                      value={productId}
                      onChange={(e) => setProductId(e.target.value)}
                      className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                    >
                      <option value="">No {terms.singular}</option>
                      {products
                        .filter((p) => p.status === "ACTIVE" || p.id === productId)
                        .map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                  </div>
                )}

                {errorBox}
              </div>

              <ModalFooter className="flex gap-2 border-t border-outline-variant px-4 pt-3">
                <Button variant="ghost" size="lg" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button
                  size="lg"
                  onClick={handleSave}
                  disabled={createTemplate.isPending || updateTemplate.isPending}
                  loading={createTemplate.isPending || updateTemplate.isPending}
                  className="flex-1"
                >
                  {editId ? "Save changes" : "Create template"}
                </Button>
              </ModalFooter>
            </>
          )}
        </Modal>
      )}

      {/* Phones: everything about one template, opened from its row */}
      <BottomSheet
        open={isMobile && !!detail}
        onClose={closeDetail}
        title={detail?.name ?? "Template"}
        maxHeight={0.95}
        className="h-[95dvh]"
      >
        {detail && (
          <div className="flex min-h-full flex-col">
            <div className="flex-1 space-y-4 px-4 pt-2 pb-4">
              {/* The message as the customer sees it */}
              <div className="rounded-xl bg-surface-container p-3">
                <div className="ml-auto w-fit max-w-[90%] rounded-2xl rounded-tr-sm bg-bubble-out px-3 py-2 text-body text-on-bubble-out whitespace-pre-wrap break-words">
                  {extractBody(detail) || "—"}
                </div>
              </div>

              <GroupedSection className="!mx-0 !mb-0">
                <ListRow
                  title="Category"
                  detail={
                    isShopifyTemplate(detail)
                      ? (getShopifyType(detail) ? SHOPIFY_TEMPLATE_TYPES[getShopifyType(detail)!] ?? "Shopify" : "Shopify")
                      : detail.category ? categoryLabel(detail.category) : "—"
                  }
                />
                <ListRow
                  title="Language"
                  detail={LANGUAGES.find((l) => l.value === detail.language)?.label ?? detail.language.toUpperCase()}
                />
                <ListRow
                  title={terms.Singular}
                  detail={(() => {
                    const id = getProductId(detail);
                    return (id && productMap[id]) || "—";
                  })()}
                />
                <ListRow title="Status" detail={TEMPLATE_STATUS_LABELS[detail.status] ?? detail.status} />
                <ListRow
                  title="Created"
                  detail={new Date(detail.createdAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                />
              </GroupedSection>
            </div>

            <div className="sticky bottom-0 flex gap-2 border-t border-outline-variant bg-surface px-4 pt-3 pb-1 [html[data-platform=android]_&]:bg-surface-container-low">
              {isShopifyTemplate(detail) ? (
                <p className="flex min-h-11 flex-1 items-center gap-1.5 text-label text-on-surface-variant">
                  <Lock className="h-3.5 w-3.5" aria-hidden /> System template — cannot be deleted
                </p>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  className="flex-1 text-error"
                  onClick={() => {
                    const tpl = detail;
                    setDetail(null);
                    setDeleteTarget(tpl);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" aria-hidden /> Delete
                </Button>
              )}
              <Button
                size="lg"
                className="flex-1"
                onClick={() => {
                  const tpl = detail;
                  setDetail(null);
                  startEdit(tpl);
                }}
              >
                <Pencil className="h-4 w-4 mr-1" aria-hidden /> Edit
              </Button>
            </div>
          </div>
        )}
      </BottomSheet>

      {/* Category chips (only categories in use) + search on phones (desktop: in the header) */}
      {templates && templates.length > 0 && (
        <>
          <SearchInput
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates"
            className="w-full lg:hidden"
          />
          <FilterBar className="mobile-scroll-x">
            <div data-tour="templates-tabs">
              <Tabs
                tabs={CATEGORIES.map((cat) => ({
                  id: cat,
                  label: cat === "" ? "All" : categoryLabel(cat),
                  count: cat === "" ? templates.length : templates.filter((t) => t.category === cat).length,
                })).filter((tab) => tab.id === "" || tab.count > 0)}
                activeTab={categoryFilter}
                onTabChange={setCategoryFilter}
              />
            </div>
          </FilterBar>
        </>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <DataTable
          label="Templates"
          columns={columns}
          rows={filtered}
          rowKey={(tpl) => tpl.id}
          rowLabel={(tpl) => tpl.name}
          // Phones: one compact row per template; tap for the full detail sheet
          mobileListClassName="mx-0 mt-0 mb-0"
          renderMobileRow={(tpl) => (
            <button
              type="button"
              onClick={() => setDetail(tpl)}
              className="flex min-h-11 w-full flex-col gap-0.5 px-4 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-focus active:bg-surface-container"
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-body font-semibold text-on-surface">{tpl.name}</span>
                {isShopifyTemplate(tpl) ? (
                  <Badge variant="success">Shopify</Badge>
                ) : tpl.category ? (
                  <Badge variant="muted">{categoryLabel(tpl.category)}</Badge>
                ) : null}
              </span>
              <span className="block w-full truncate text-label text-on-surface-variant">
                {extractBody(tpl) || "—"}
              </span>
            </button>
          )}
        />
      ) : templates && templates.length > 0 && search ? (
        <p className="text-body text-on-surface-variant/50 text-center py-8">
          No templates match "{search}"
        </p>
      ) : (
        !showForm && (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No templates yet"
            description="Create reusable message templates for campaigns and quick replies"
            actionLabel="New template"
            onAction={() => { resetForm(); setShowForm(true); }}
          />
        )
      )}

      {/* AI Generate Modal */}
      <Modal
        open={showAiModal}
        onClose={() => { setShowAiModal(false); setAiPrompt(""); }}
        dismissible={!generateTemplate.isPending}
        aria-labelledby="ai-template-modal-title"
        className="max-w-md border border-outline-variant bg-surface"
      >
        {() => (
          <>
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                <h2 id="ai-template-modal-title" className="text-body-lg font-semibold text-on-surface">Generate template with AI</h2>
              </div>
              <IconButton size="xs"
                onClick={() => { setShowAiModal(false); setAiPrompt(""); }} aria-label="Close" title="Close">
                <X className="h-4 w-4" />
              </IconButton>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <label htmlFor="ai-template-prompt" className="block text-caption font-medium text-on-surface-variant mb-1.5">
                  Describe the template you want *
                </label>
                <textarea
                  id="ai-template-prompt"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Welcome a new customer after signup and offer a 10% discount"
                  rows={3}
                  autoFocus
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="ai-template-category" className="block text-caption font-medium text-on-surface-variant mb-1.5">Category</label>
                  <select
                    id="ai-template-category"
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c ? categoryLabel(c) : "No category"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ai-template-language" className="block text-caption font-medium text-on-surface-variant mb-1.5">Language</label>
                  <select
                    id="ai-template-language"
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-body text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-caption text-on-surface-variant/50">
                AI will generate a name and body. You can review and edit before saving.
              </p>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-outline-variant">
              <Button variant="ghost" size="sm" onClick={() => { setShowAiModal(false); setAiPrompt(""); }}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleGenerate}
                disabled={!aiPrompt.trim() || generateTemplate.isPending}
                loading={generateTemplate.isPending}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                {generateTemplate.isPending ? "Generating..." : "Generate"}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete template"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteTemplate.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteTemplate.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            });
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
