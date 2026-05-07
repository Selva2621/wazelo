"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, FileText, Trash2, Pencil, Search, Package, GripVertical, User, Sparkles, X, ShoppingBag, ShoppingCart, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Table,
  TableHeader,
  TableHeaderRow,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useGenerateTemplate,
} from "@/hooks/use-templates";
import { useProducts } from "@/hooks/use-products";
import { listFieldDefinitions, type CustomFieldDefinition } from "@/lib/api/custom-fields";
import type { MessageTemplate } from "@/lib/types/templates";

const CATEGORIES = ["", "MARKETING", "UTILITY", "AUTHENTICATION", "SHOPIFY"] as const;

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
  const { data: templates, isLoading } = useTemplates();
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

  const allFields = useMemo(() => {
    const custom: { fieldName: string; fieldLabel: string }[] = (customFields ?? []).map((f: CustomFieldDefinition) => ({
      fieldName: f.fieldName,
      fieldLabel: f.fieldLabel,
    }));
    return [...SYSTEM_FIELDS, ...custom];
  }, [customFields]);

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

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Message Templates
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Create reusable message templates for campaigns and quick replies
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => setShowAiModal(true)}>
            <Sparkles className="h-4 w-4 mr-1" /> Generate with AI
          </Button>
          <Button onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus className="h-4 w-4 mr-1" /> New Template
          </Button>
        </div>
      </div>

      {/* Create/Edit Form — 2 column layout */}
      {showForm && (
        <div className="rounded-2xl border border-outline-variant/15 bg-surface-container overflow-hidden">
          <div className="px-5 py-4 border-b border-outline-variant/10">
            <h3 className="text-[14px] font-semibold text-on-surface">
              {editId ? "Edit Template" : "Create Template"}
            </h3>
          </div>

          <div className="grid grid-cols-[1fr_280px] divide-x divide-outline-variant/10">
            {/* Left: Template fields */}
            <div className="p-5 space-y-3">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Template name * (e.g. welcome_offer)"
                autoFocus
                className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
              />

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c || "No category"}</option>
                  ))}
                </select>

                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Body textarea with drag-drop */}
              <div>
                <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">
                  Message Body *
                  <span className="ml-2 font-normal opacity-60">— drag fields from the right panel to insert</span>
                </p>
                <textarea
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
                  className={`w-full rounded-lg border px-3 py-2.5 text-[13px] text-on-surface focus:outline-none focus:ring-1 resize-none transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-outline-variant/20 bg-surface focus:border-primary focus:ring-primary/30"
                  }`}
                />
                <div className="flex justify-end mt-1">
                  <p className="text-[11px] text-on-surface-variant/50 tabular-nums">
                    {body.length} / 4,096
                  </p>
                </div>
              </div>

              {formError && (
                <p className="text-[12px] text-error bg-error/8 border border-error/15 px-3 py-2 rounded-lg">
                  {formError}
                </p>
              )}

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
                  {editId ? "Update Template" : "Create Template"}
                </Button>
              </div>
            </div>

            {/* Right: Contact fields + Product selector */}
            <div className="flex flex-col divide-y divide-outline-variant/10 overflow-y-auto max-h-[520px]">
              {/* Contact Fields */}
              <div className="p-4">
                <div className="flex items-center gap-1.5 mb-3">
                  <User className="h-3.5 w-3.5 text-primary" />
                  <p className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">
                    Contact Fields
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
                        title={`Insert ${variable}`}
                        className="flex items-center gap-1 px-2 py-1 rounded-md bg-surface border border-outline-variant/20 text-[11px] text-on-surface-variant cursor-grab active:cursor-grabbing hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-colors select-none"
                      >
                        <GripVertical className="h-3 w-3 opacity-40 shrink-0" />
                        <span className="font-medium">{field.fieldLabel}</span>
                        <span className="opacity-40 font-mono text-[10px]">{`{{${field.fieldName}}}`}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product selector */}
              {products && products.length > 0 && (
                <div className="p-4">
                  <div className="flex items-center gap-1.5 mb-3">
                    <Package className="h-3.5 w-3.5 text-primary" />
                    <p className="text-[11px] font-semibold text-on-surface uppercase tracking-wide">
                      Link to Product
                    </p>
                  </div>
                  <p className="text-[11px] text-on-surface-variant/60 mb-2">
                    Group this template under a product
                  </p>
                  <div className="space-y-1">
                    {/* No product option */}
                    <button
                      type="button"
                      onClick={() => setProductId("")}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-left transition-colors border ${
                        !productId
                          ? "border-primary/40 bg-primary/5 text-primary font-medium"
                          : "border-transparent text-on-surface-variant hover:bg-surface"
                      }`}
                    >
                      <span className="text-[10px] opacity-60">—</span>
                      No product
                    </button>
                    {products
                      .filter((p) => p.status === "ACTIVE")
                      .map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setProductId(p.id === productId ? "" : p.id)}
                          className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-left transition-colors border ${
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

      {/* Filter tabs + Search */}
      {templates && templates.length > 0 && (
        <div className="flex items-center justify-between gap-3 flex-wrap">
          {/* Category tabs */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-surface-container border border-outline-variant/10">
            {(["", "MARKETING", "UTILITY", "AUTHENTICATION", "SHOPIFY"] as const).map((cat) => {
              const label = cat === "" ? "All" : cat === "SHOPIFY" ? "Shopify" : cat;
              const count = cat === "" ? templates.length : templates.filter((t) => t.category === cat).length;
              if (count === 0 && cat !== "") return null;
              return (
                <button
                  key={cat}
                  onClick={() => setCategoryFilter(cat)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                    categoryFilter === cat
                      ? cat === "SHOPIFY"
                        ? "bg-emerald-500/15 text-emerald-700"
                        : "bg-primary/10 text-primary"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface"
                  }`}
                >
                  {cat === "SHOPIFY" && <ShoppingBag className="h-3 w-3" />}
                  {label}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    categoryFilter === cat
                      ? cat === "SHOPIFY" ? "bg-emerald-500/20 text-emerald-700" : "bg-primary/15 text-primary"
                      : "bg-outline-variant/15 text-on-surface-variant/60"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/10 min-w-[200px]">
            <Search className="h-4 w-4 text-on-surface-variant/40 shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 bg-transparent text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/40"
            />
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-2xl border border-outline-variant/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Template Name</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Language</TableHead>
                <TableHead>Body Preview</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tpl) => {
                const bodyText = extractBody(tpl);
                const linkedProductId = getProductId(tpl);
                const linkedProductName = linkedProductId ? productMap[linkedProductId] : null;
                const isShopify = isShopifyTemplate(tpl);
                const shopifyType = isShopify ? getShopifyType(tpl) : null;
                const ShopifyIcon = shopifyType === "cart_abandoned" ? ShoppingCart : ShoppingBag;
                return (
                  <TableRow key={tpl.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isShopify ? "bg-emerald-500/10" : "bg-primary/10"}`}>
                          {isShopify
                            ? <ShopifyIcon className="h-4 w-4 text-emerald-600" />
                            : <FileText className="h-4 w-4 text-primary" />
                          }
                        </div>
                        <div>
                          <span className="text-[13px] font-medium text-on-surface">
                            {tpl.name}
                          </span>
                          {isShopify && (
                            <p className="text-[11px] text-emerald-600/70 leading-none mt-0.5">
                              {shopifyType ? SHOPIFY_TEMPLATE_TYPES[shopifyType] ?? shopifyType : "Shopify"}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      {linkedProductName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-container text-[11px] text-on-surface-variant border border-outline-variant/15">
                          <Package className="h-3 w-3 opacity-60" />
                          {linkedProductName}
                        </span>
                      ) : (
                        <span className="text-[12px] text-on-surface-variant/40">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {isShopify ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-[11px] font-medium text-emerald-700 border border-emerald-500/20">
                          <ShoppingBag className="h-3 w-3" />
                          Shopify
                        </span>
                      ) : (
                        <span className="text-[12px] text-on-surface-variant">
                          {tpl.category || "—"}
                        </span>
                      )}
                    </TableCell>

                    <TableCell className="text-[12px] text-on-surface-variant uppercase">
                      {tpl.language}
                    </TableCell>

                    <TableCell className="text-[12px] text-on-surface-variant truncate max-w-[240px]">
                      {bodyText || "—"}
                    </TableCell>

                    <TableCell className="text-[12px] text-on-surface-variant">
                      {new Date(tpl.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => startEdit(tpl)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        {isShopify ? (
                          <span
                            title="System template — cannot be deleted"
                            className="p-1.5 rounded-lg text-on-surface-variant/25 cursor-not-allowed"
                          >
                            <Lock className="h-3.5 w-3.5" />
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteTarget(tpl)}
                            className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : templates && templates.length > 0 && search ? (
        <p className="text-[13px] text-on-surface-variant/50 text-center py-8">
          No templates match "{search}"
        </p>
      ) : (
        !showForm && (
          <EmptyState
            icon={<FileText className="h-8 w-8" />}
            title="No templates yet"
            description="Create reusable message templates for campaigns and quick replies"
            actionLabel="Create Template"
            onAction={() => { resetForm(); setShowForm(true); }}
          />
        )
      )}

      {/* AI Generate Modal */}
      {showAiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-outline-variant/15 bg-surface shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-outline-variant/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3 className="text-[14px] font-semibold text-on-surface">Generate Template with AI</h3>
              </div>
              <button
                onClick={() => { setShowAiModal(false); setAiPrompt(""); }}
                className="p-1 rounded-lg text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div>
                <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">
                  Describe the template you want *
                </p>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. Welcome a new customer after signup and offer a 10% discount"
                  rows={3}
                  autoFocus
                  className="w-full rounded-lg border border-outline-variant/20 bg-surface-container px-3 py-2.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">Category</p>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c || "No category"}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-on-surface-variant mb-1.5">Language</p>
                  <select
                    value={aiLanguage}
                    onChange={(e) => setAiLanguage(e.target.value)}
                    className="w-full rounded-lg border border-outline-variant/20 bg-surface px-3 py-2.5 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30"
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>{l.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-on-surface-variant/50">
                AI will generate a name and body. You can review and edit before saving.
              </p>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-outline-variant/10">
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
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Template"
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
