"use client";

import { useState, useMemo, useRef, useCallback, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Plus, FileText, Trash2, Pencil, Package, GripVertical, User, Sparkles, ShoppingBag, ShoppingCart, Lock,
  MessageSquare, Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState, LoadError } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Modal, ModalFooter } from "@/components/ui/modal";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { BottomSheet } from "@/components/ios/bottom-sheet";
import { GroupedSection, ListRow } from "@/components/ios/grouped-list";
import { SegmentedControl } from "@/components/ios/segmented-control";
import { WhatsAppPhonePreview } from "@/components/whatsapp/whatsapp-phone-preview";
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
import { TEMPLATE_STATUS_LABELS, templateImageUrl, type MessageTemplate } from "@/lib/types/templates";
import { MediaPicker } from "@/components/ui/media-picker";
import type { PhonePreviewMessage } from "@/components/whatsapp/whatsapp-phone-preview";
import { IconButton } from "@/components/ui/icon-button";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { PageHeader } from "@/components/layout/page-header";
import { channelPanelProps } from "./channel-tabs";
import { EditPreviewSwitch, TemplatePreviewPanel, type EditorView } from "./template-preview-panel";
import {
  AiWriteModal,
  FormError,
  LABEL_CLASS,
  SectionHeading,
  TEMPLATE_LANGUAGES,
  TEXTAREA_CLASS,
  TemplateEditorModal,
  WriteWithAiButton,
  apiErrorMessage,
} from "./template-editor-modal";

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
const LANGUAGES = TEMPLATE_LANGUAGES;

const SYSTEM_FIELDS = [
  { fieldName: "name", fieldLabel: "Name" },
  { fieldName: "phone", fieldLabel: "Phone" },
  { fieldName: "email", fieldLabel: "Email" },
  { fieldName: "lead_status", fieldLabel: "Lead Status" },
  { fieldName: "lead_score", fieldLabel: "Lead Score" },
  { fieldName: "source", fieldLabel: "Source" },
];

const DETAIL_VIEWS: { value: "preview" | "details"; label: string }[] = [
  { value: "preview", label: "Preview" },
  { value: "details", label: "Details" },
];

function extractBody(tpl: MessageTemplate): string {
  return tpl.components.find((c) => c.type === "BODY")?.text ?? "";
}

/** One preview bubble: the image (if any) with the message as its caption */
function previewMessage(body: string, imageUrl: string): PhonePreviewMessage {
  return imageUrl ? { key: "body", body, messageType: "IMAGE", mediaUrl: imageUrl } : { key: "body", body };
}

function getProductId(tpl: MessageTemplate): string | null {
  const ev = tpl.exampleValues as Record<string, string> | null;
  return ev?.productId ?? null;
}

export function WhatsAppTemplates({ channelTabs }: { channelTabs: ReactNode }) {
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
  const senderName = orgSettings?.name || undefined;

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("");
  const [language, setLanguage] = useState("en");
  const [productId, setProductId] = useState<string>("");
  const [imageUrl, setImageUrl] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<MessageTemplate | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [formError, setFormError] = useState("");
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiCategory, setAiCategory] = useState("");
  const [aiLanguage, setAiLanguage] = useState("en");
  // Phones: Edit | Preview inside the editor sheet
  const [mobileView, setMobileView] = useState<EditorView>("edit");
  // Phones: the template tapped in the list, shown in a full-height detail sheet
  const [detail, setDetail] = useState<MessageTemplate | null>(null);
  const [detailView, setDetailView] = useState<"preview" | "details">("preview");
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
    setImageUrl("");
    setEditId(null);
    setFormError("");
    setMobileView("edit");
    setShowForm(false);
  };

  const handleGenerate = () => {
    if (!aiPrompt.trim()) return;
    generateTemplate.mutate(
      { prompt: aiPrompt.trim(), category: aiCategory || undefined, language: aiLanguage },
      {
        onSuccess: (result) => {
          if (showForm) {
            // Editing already: fill the message, keep what the member set
            if (!name.trim()) setName(result.name);
            setBody(result.body);
            if (aiCategory) setCategory(aiCategory);
            setLanguage(aiLanguage);
            setFormError("");
          } else {
            resetForm();
            setName(result.name);
            setBody(result.body);
            setCategory(aiCategory);
            setLanguage(aiLanguage);
            setShowForm(true);
          }
          setShowAiModal(false);
          setAiPrompt("");
          setAiCategory("");
          setAiLanguage("en");
        },
      },
    );
  };

  const closeAiModal = () => {
    if (generateTemplate.isPending) return;
    setShowAiModal(false);
    setAiPrompt("");
    generateTemplate.reset();
  };

  const openAiModal = () => {
    generateTemplate.reset();
    setShowAiModal(true);
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
        onError: (err) => setFormError(apiErrorMessage(err, "Couldn't rewrite it right now. Please try again.")),
      },
    );
  };

  const handleSave = () => {
    setFormError("");
    const fail = (msg: string) => { setFormError(msg); setMobileView("edit"); };
    if (!name.trim()) { fail("Template name is required."); return; }
    if (name.trim().length > 255) { fail("Name must be 255 characters or less."); return; }
    if (!body.trim()) { fail("Message body is required."); return; }
    if (body.trim().length > 4096) { fail("Message body must be 4096 characters or less."); return; }
    const payload = {
      name: name.trim(),
      body: body.trim(),
      category: category || undefined,
      language,
      productId: productId || undefined,
      imageUrl: imageUrl || undefined,
    };
    if (editId) {
      updateTemplate.mutate(
        { id: editId, ...payload, productId: productId || null, imageUrl: imageUrl || null },
        { onSuccess: resetForm, onError: (err) => fail(apiErrorMessage(err, "Failed to save template.")) },
      );
    } else {
      createTemplate.mutate(payload, {
        onSuccess: resetForm,
        onError: (err) => fail(apiErrorMessage(err, "Failed to create template.")),
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
    setImageUrl(templateImageUrl(tpl));
    setFormError("");
    setMobileView("edit");
    setShowForm(true);
  };

  const openDetail = (tpl: MessageTemplate) => {
    setDetailView("preview");
    setDetail(tpl);
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

  // The linked-product column only when some template is linked (otherwise a column of "—")
  const anyLinked = (templates ?? []).some((t) => !!getProductId(t) && !!productMap[getProductId(t)!]);
  const visibleColumns = anyLinked ? columns : columns.filter((c) => c.id !== "product");

  if (isLoading || isError) {
    return (
      <div className="space-y-4 max-lg:px-4 max-lg:pb-4 lg:p-6">
        {channelTabs}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <LoadError what="templates" onRetry={() => refetch()} />
        )}
      </div>
    );
  }

  const saving = createTemplate.isPending || updateTemplate.isPending;

  // Form pieces shared by the desktop dialog and the phone sheet (only one renders)
  const nameInput = (
    <div>
      <Label htmlFor="template-name" className={LABEL_CLASS}>
        Template name *
      </Label>
      <Input
        id="template-name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={255}
        placeholder="e.g. welcome_offer"
        autoFocus={!isMobile}
      />
    </div>
  );

  const categoryLanguageFields = (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Label htmlFor="template-category" className={LABEL_CLASS}>
          Category
        </Label>
        <Select id="template-category" value={category} onChange={(e) => setCategory(e.target.value)}>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c ? categoryLabel(c) : "No category"}</option>
          ))}
        </Select>
      </div>
      <div>
        <Label htmlFor="template-language" className={LABEL_CLASS}>
          Language
        </Label>
        <Select id="template-language" value={language} onChange={(e) => setLanguage(e.target.value)}>
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </Select>
      </div>
    </div>
  );

  // Link to a product: same values on desktop and phones
  const productField =
    products && products.length > 0 ? (
      <div>
        <Label htmlFor="template-product" className={LABEL_CLASS}>
          Link to {terms.singular}
        </Label>
        <Select id="template-product" value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">No {terms.singular}</option>
          {products
            .filter((p) => p.status === "ACTIVE" || p.id === productId)
            .map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
        </Select>
        <p className="mt-1 text-caption text-on-surface-variant/60">Group this template under a {terms.singular}</p>
      </div>
    ) : null;

  // Body textarea with drag-drop
  const bodyField = (
    <div>
      <Label htmlFor="template-body" className={LABEL_CLASS}>
        Message body *
        <span className="ml-2 font-normal opacity-60 max-lg:hidden">— click or drag a field below to insert</span>
        <span className="ml-2 font-normal opacity-60 lg:hidden">— tap a field below to insert</span>
      </Label>
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
        className={`${TEXTAREA_CLASS} resize-y transition-colors ${isDragOver ? "bg-primary/5 ring-2 ring-primary/40" : ""}`}
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

  // Optional image sent above the message: browse/drop a file or paste a link
  const imageField = (
    <div>
      <Label htmlFor="template-image" className={LABEL_CLASS}>
        Image <span className="font-normal text-on-surface-variant/50">(optional)</span>
      </Label>
      <MediaPicker id="template-image" kind="image" value={imageUrl} onChange={(url) => setImageUrl(url)} />
    </div>
  );

  const errorBox = <FormError message={formError} />;

  // Desktop: contact fields to click or drag into the message
  const contactFieldChips = (
    <div>
      <div className="mb-1.5 flex items-center gap-1.5">
        <User className="h-3.5 w-3.5 text-on-surface-variant" aria-hidden />
        <p id="template-contact-fields" className="text-caption font-medium text-on-surface-variant">
          Contact fields
        </p>
      </div>
      <div role="group" aria-labelledby="template-contact-fields" className="flex flex-wrap gap-1.5">
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
              aria-label={`Insert ${field.fieldLabel}`}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface border border-outline-variant outline-none focus-visible:ring-2 focus-visible:ring-focus text-caption text-on-surface-variant cursor-grab active:cursor-grabbing hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors select-none"
            >
              <GripVertical className="h-3 w-3 opacity-40 shrink-0" aria-hidden />
              <span className="font-medium">{field.fieldLabel}</span>
              <span className="opacity-40 font-mono text-caption">{variable}</span>
            </div>
          );
        })}
      </div>
    </div>
  );

  // What the contact receives, updated as you type
  const livePreview = (
    <WhatsAppPhonePreview senderName={senderName} messages={[previewMessage(body, imageUrl)]} />
  );

  return (
    // Desktop: room around the page, like the other list pages
    <div className="space-y-4 max-lg:px-4 max-lg:pb-4 lg:p-6">
      <MobilePageActions
        primary={{ label: "New template", onClick: () => { resetForm(); setShowForm(true); } }}
        more={[{ label: "Generate with AI", onSelect: openAiModal }]}
      />
      {/* Header */}
      <PageHeader
        title="Templates"
        className="max-lg:hidden"
        actions={
          <>
            <Button variant="secondary" onClick={openAiModal}>
              <Sparkles className="h-4 w-4 mr-1" /> Generate with AI
            </Button>
            <Button onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus className="h-4 w-4 mr-1" /> New template
            </Button>
          </>
        }
      />

      {channelTabs}

      <div {...channelPanelProps("whatsapp")}>
      {/* Desktop: large dialog, form left and live preview right (like New Campaign) */}
      {!isMobile && (
        <TemplateEditorModal
          open={showForm}
          onClose={resetForm}
          dismissible={!saving && !showAiModal}
          titleId="template-modal-title"
          title={editId ? "Edit template" : "New template"}
          icon={<FileText className="h-4 w-4" />}
          preview={<TemplatePreviewPanel>{livePreview}</TemplatePreviewPanel>}
          error={formError}
          onSave={handleSave}
          saving={saving}
          saveLabel={editId ? "Save changes" : "Create template"}
        >
          <div className="space-y-3">
            <SectionHeading
              icon={<Tag className="h-3.5 w-3.5" />}
              label="Details"
              action={<WriteWithAiButton onClick={openAiModal} />}
            />
            {nameInput}
            {categoryLanguageFields}
          </div>
          <div className="space-y-3">
            <SectionHeading icon={<MessageSquare className="h-3.5 w-3.5" />} label="Message" />
            {imageField}
            {bodyField}
            {contactFieldChips}
          </div>
          {productField && (
            <div className="space-y-3">
              <SectionHeading icon={<Package className="h-3.5 w-3.5" />} label={terms.Singular} />
              {productField}
            </div>
          )}
        </TemplateEditorModal>
      )}

      {/* Phones: create/edit as a full-height sheet: Edit | Preview, fields as a sideways row, sticky actions */}
      {isMobile && (
        <Modal
          open={showForm}
          onClose={resetForm}
          dismissible={!saving && !showAiModal}
          aria-labelledby="template-form-title"
          className="flex h-[calc(100dvh-var(--safe-top)-12px)] flex-col"
        >
          {() => (
            <>
              <div className="flex items-center justify-between gap-2 px-4 pt-5 pb-2">
                <h2 id="template-form-title" className="text-body-lg font-semibold text-on-surface">
                  {editId ? "Edit template" : "New template"}
                </h2>
                {mobileView === "edit" && <WriteWithAiButton onClick={openAiModal} className="min-h-11" />}
              </div>

              <div className="px-4 pb-3">
                <EditPreviewSwitch value={mobileView} onChange={setMobileView} />
              </div>

              {mobileView === "preview" ? (
                <TemplatePreviewPanel className="flex-1 overflow-y-auto px-4 pb-4">
                  {livePreview}
                </TemplatePreviewPanel>
              ) : (
              <div className="flex-1 space-y-3 px-4 pb-4">
                {nameInput}
                {categoryLanguageFields}
                {imageField}
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

                {productField}

                {errorBox}
              </div>
              )}

              <ModalFooter className="flex gap-2 border-t border-outline-variant px-4 pt-3">
                <Button variant="ghost" size="lg" onClick={resetForm} className="flex-1">
                  Cancel
                </Button>
                <Button size="lg" onClick={handleSave} disabled={saving} loading={saving} className="flex-1">
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
              <SegmentedControl label="Preview or details" value={detailView} onChange={setDetailView} options={DETAIL_VIEWS} />

              {detailView === "preview" ? (
                // The message as the customer sees it
                <TemplatePreviewPanel>
                  <WhatsAppPhonePreview
                    senderName={senderName}
                    messages={[previewMessage(extractBody(detail), templateImageUrl(detail))]}
                  />
                </TemplatePreviewPanel>
              ) : (
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
              )}
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

      {/* Narrow the list: category (only ones in use) on the left, search on the right */}
      {templates && templates.length > 0 && (
        <FilterBar className="justify-between">
          <span data-tour="templates-categories" className="max-lg:w-full">
            <FilterSelect
              label="Category"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              active={!!categoryFilter}
              wrapperClassName="max-lg:w-full"
              className="max-lg:h-11 max-lg:w-full"
            >
              {CATEGORIES.map((cat) => ({
                id: cat,
                count: cat === "" ? templates.length : templates.filter((t) => t.category === cat).length,
              }))
                .filter((c) => c.id === "" || c.count > 0)
                .map((c) => (
                  <option key={c.id} value={c.id} data-hint={c.count}>
                    {c.id === "" ? "All categories" : categoryLabel(c.id)}
                  </option>
                ))}
            </FilterSelect>
          </span>
          <SearchInput
            aria-label="Search templates"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search templates"
            className="w-64 max-lg:w-full"
          />
        </FilterBar>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <DataTable
          label="Templates"
          columns={visibleColumns}
          rows={filtered}
          rowKey={(tpl) => tpl.id}
          rowLabel={(tpl) => tpl.name}
          // Phones: one compact row per template; tap for the full detail sheet
          mobileListClassName="mx-0 mt-0 mb-0"
          renderMobileRow={(tpl) => (
            <button
              type="button"
              onClick={() => openDetail(tpl)}
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
          No templates match &quot;{search}&quot;
        </p>
      ) : (
        (!showForm || !isMobile) && (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No templates yet"
            description="Create reusable message templates for campaigns and quick replies"
            actionLabel="New template"
            onAction={() => { resetForm(); setShowForm(true); }}
          />
        )
      )}
      </div>

      {/* Write with AI (from the page header or inside the editor) */}
      <AiWriteModal
        open={showAiModal}
        onClose={closeAiModal}
        titleId="ai-template-modal-title"
        title="Write template with AI"
        promptId="ai-template-prompt"
        promptLabel="Describe the template you want *"
        placeholder="e.g. Welcome a new customer after signup and offer a 10% discount"
        prompt={aiPrompt}
        onPromptChange={setAiPrompt}
        onGenerate={handleGenerate}
        pending={generateTemplate.isPending}
        error={generateTemplate.isError ? apiErrorMessage(generateTemplate.error, "Couldn't write the template right now. Please try again.") : ""}
        hint={
          showForm
            ? "AI rewrites the message. Review before saving. Uses AI credits."
            : "AI writes a name and message. Review and edit before saving. Uses AI credits."
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ai-template-category" className="block text-caption font-medium text-on-surface-variant mb-1.5">Category</label>
            <Select
              id="ai-template-category"
              value={aiCategory}
              onChange={(e) => setAiCategory(e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c ? categoryLabel(c) : "No category"}</option>
              ))}
            </Select>
          </div>
          <div>
            <label htmlFor="ai-template-language" className="block text-caption font-medium text-on-surface-variant mb-1.5">Language</label>
            <Select
              id="ai-template-language"
              value={aiLanguage}
              onChange={(e) => setAiLanguage(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
              ))}
            </Select>
          </div>
        </div>
      </AiWriteModal>

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
