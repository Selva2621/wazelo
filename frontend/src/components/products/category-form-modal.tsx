"use client";

import { useState, useEffect } from "react";
import { X, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProductCategory, useUpdateProductCategory, useProductCategories } from "@/hooks/use-products";
import type { ProductCategory } from "@/lib/types/products";

interface CategoryFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass existing category to edit mode */
  category?: ProductCategory;
}

const PRESET_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#64748b", "#0ea5e9", "#10b981",
];

const inputCls =
  "w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/10";

export function CategoryFormModal({ open, onClose, category }: CategoryFormModalProps) {
  const isEditing = !!category;
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const { data: allCategories } = useProductCategories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [parentId, setParentId] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setDescription(category.description ?? "");
      setColor(category.color ?? PRESET_COLORS[0]);
      setParentId(category.parentId ?? "");
      setSortOrder(String(category.sortOrder ?? 0));
      setIsActive(category.isActive ?? true);
    } else {
      setName(""); setDescription(""); setColor(PRESET_COLORS[0]);
      setParentId(""); setSortOrder("0"); setIsActive(true);
    }
    setError(null);
  }, [category, open]);

  const isPending = createCategory.isPending || updateCategory.isPending;

  // Exclude self and own children from parent options (prevent circular)
  const parentOptions = (allCategories ?? []).filter(
    (c) => c.id !== category?.id && c.parentId !== category?.id
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) { setError("Category name is required."); return; }

    if (name.trim().length > 100) { setError("Name must be 100 characters or less."); return; }
    if (description.trim().length > 500) { setError("Description must be 500 characters or less."); return; }
    const parsedSort = parseInt(sortOrder) || 0;
    if (parsedSort < 0 || parsedSort > 9999) { setError("Sort order must be between 0 and 9999."); return; }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      color,
      sortOrder: parsedSort,
      parentId: parentId || undefined,
    };

    if (isEditing && category) {
      updateCategory.mutate(
        { id: category.id, ...payload, isActive },
        { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
      );
    } else {
      createCategory.mutate(
        payload,
        { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
      );
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10 sticky top-0 bg-surface-container-lowest z-10">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Tag className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-on-surface">
              {isEditing ? "Edit Category" : "New Category"}
            </h2>
            <p className="text-[11px] text-on-surface-variant/60">
              {isEditing ? "Update category details" : "Organise products into categories"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <Label htmlFor="cf-name">
              Name <span className="text-error">*</span>
            </Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Electronics"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="cf-desc">
              Description{" "}
              <span className="font-normal text-on-surface-variant/50">(optional)</span>
            </Label>
            <textarea
              id="cf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of products belong here?"
              rows={2}
              className={`mt-1 ${inputCls} resize-none`}
            />
          </div>

          {/* Color */}
          <div>
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="h-7 w-7 rounded-full transition-all shrink-0"
                  style={{
                    background: c,
                    outline: color === c ? `3px solid ${c}` : "2px solid transparent",
                    outlineOffset: 2,
                  }}
                  title={c}
                />
              ))}
              {/* Custom hex input */}
              <div className="flex items-center gap-1.5 ml-1">
                <div
                  className="h-7 w-7 rounded-full border-2 border-outline-variant/20 shrink-0"
                  style={{ background: color }}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) setColor(val);
                  }}
                  placeholder="#6366f1"
                  maxLength={7}
                  className="w-20 rounded-lg bg-surface-container-low px-2 py-1 text-[12px] font-mono text-on-surface outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/10"
                />
              </div>
            </div>
          </div>

          {/* Parent category + Sort order — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cf-parent">
                Parent Category{" "}
                <span className="font-normal text-on-surface-variant/50">(optional)</span>
              </Label>
              <select
                id="cf-parent"
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className={`mt-1 ${inputCls}`}
              >
                <option value="">None (top-level)</option>
                {parentOptions.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="cf-sort">
                Sort Order{" "}
                <span className="font-normal text-on-surface-variant/50">(lower = first)</span>
              </Label>
              <input
                id="cf-sort"
                type="number"
                min="0"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className={`mt-1 ${inputCls}`}
              />
            </div>
          </div>

          {/* Active toggle — edit only */}
          {isEditing && (
            <div className="flex items-center justify-between px-4 py-3 rounded-xl border border-outline-variant/10 bg-surface-container">
              <div>
                <p className="text-[13px] font-medium text-on-surface">Active</p>
                <p className="text-[11px] text-on-surface-variant/60">
                  Inactive categories are hidden from product forms
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((v) => !v)}
                className={`relative h-5 w-9 rounded-full transition-colors ${isActive ? "bg-primary" : "bg-surface-container-high"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${isActive ? "translate-x-4" : "translate-x-0"}`}
                />
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <p className="text-[12px] text-error bg-error/8 border border-error/15 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending} disabled={!name.trim()}>
              {isEditing ? "Save Changes" : "Create Category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
