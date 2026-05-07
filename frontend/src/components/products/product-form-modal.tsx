"use client";

import { useState, useEffect } from "react";
import { X, Package, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCreateProduct, useUpdateProduct, useProductCategories } from "@/hooks/use-products";
import type { Product } from "@/lib/types/products";

interface ProductFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Pass existing product to edit mode */
  product?: Product;
}

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD"];

const inputCls =
  "w-full rounded-xl bg-surface-container-low px-4 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-2 focus:ring-primary/40 border border-outline-variant/10";

export function ProductFormModal({ open, onClose, product }: ProductFormModalProps) {
  const isEditing = !!product;
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const { data: categories } = useProductCategories();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [sku, setSku] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Populate form when editing
  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description ?? "");
      setPrice(product.price ? parseFloat(product.price).toString() : "");
      setCurrency(product.currency ?? "INR");
      setSku(product.sku ?? "");
      setImageUrl(product.imageUrl ?? "");
      setCategoryId(product.categoryId ?? "");
    } else {
      setName(""); setDescription(""); setPrice(""); setCurrency("INR");
      setSku(""); setImageUrl(""); setCategoryId("");
    }
    setError(null);
  }, [product, open]);

  const isPending = createProduct.isPending || updateProduct.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) { setError("Product name is required."); return; }
    if (name.trim().length > 255) { setError("Product name must be 255 characters or less."); return; }
    if (description.trim().length > 2000) { setError("Description must be 2000 characters or less."); return; }
    if (sku.trim().length > 100) { setError("SKU must be 100 characters or less."); return; }
    if (price) {
      const p = parseFloat(price);
      if (isNaN(p) || p < 0) { setError("Price must be a valid positive number."); return; }
      if (p > 9999999.99) { setError("Price is too large."); return; }
    }
    if (imageUrl.trim() && !/^https?:\/\/.+/.test(imageUrl.trim())) {
      setError("Image URL must start with http:// or https://");
      return;
    }
    if (imageUrl.trim().length > 2048) { setError("Image URL must be 2048 characters or less."); return; }

    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      currency: currency || undefined,
      sku: sku.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      categoryId: categoryId || undefined,
    };

    if (isEditing && product) {
      updateProduct.mutate(
        { id: product.id, ...payload },
        { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
      );
    } else {
      createProduct.mutate(
        payload,
        { onSuccess: onClose, onError: (err) => setError((err as Error).message) },
      );
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant/10 sticky top-0 bg-surface-container-lowest z-10">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-on-surface">
              {isEditing ? "Edit Product" : "New Product"}
            </h2>
            <p className="text-[11px] text-on-surface-variant/60">
              {isEditing ? "Update product details" : "Add a product to your catalog"}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Name */}
          <div>
            <Label htmlFor="pf-name">
              Product Name <span className="text-error">*</span>
            </Label>
            <Input
              id="pf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. WhatsApp Business Plan"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="pf-desc">
              Description{" "}
              <span className="font-normal text-on-surface-variant/50">(optional)</span>
            </Label>
            <textarea
              id="pf-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Briefly describe what this product offers"
              rows={3}
              className={`mt-1 ${inputCls} resize-none`}
            />
          </div>

          {/* Price + Currency */}
          <div>
            <Label htmlFor="pf-price">
              Price{" "}
              <span className="font-normal text-on-surface-variant/50">(optional)</span>
            </Label>
            <div className="flex mt-1 rounded-xl overflow-hidden border border-outline-variant/10 bg-surface-container-low focus-within:ring-2 focus-within:ring-primary/40">
              {/* Currency selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="shrink-0 border-r border-outline-variant/10 bg-surface-container px-3 py-2.5 text-[13px] text-on-surface-variant font-medium outline-none"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              {/* Price input */}
              <input
                id="pf-price"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="flex-1 px-4 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 bg-transparent outline-none"
              />
            </div>
          </div>

          {/* SKU + Category — side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pf-sku">
                SKU{" "}
                <span className="font-normal text-on-surface-variant/50">(optional)</span>
              </Label>
              <Input
                id="pf-sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder="e.g. WA-001"
              />
            </div>
            <div>
              <Label htmlFor="pf-cat">
                Category{" "}
                <span className="font-normal text-on-surface-variant/50">(optional)</span>
              </Label>
              <select
                id="pf-cat"
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className={`mt-1 ${inputCls}`}
              >
                <option value="">No category</option>
                {(categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Image URL */}
          <div>
            <Label htmlFor="pf-img">
              Image URL{" "}
              <span className="font-normal text-on-surface-variant/50">(optional)</span>
            </Label>
            <div className="flex gap-3 items-start mt-1">
              <div className="flex-1">
                <input
                  id="pf-img"
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://example.com/image.png"
                  className={inputCls}
                />
              </div>
              {/* Preview */}
              <div className="h-10 w-10 rounded-lg border border-outline-variant/15 bg-surface-container flex items-center justify-center shrink-0 overflow-hidden">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt="preview"
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                ) : (
                  <ImageIcon className="h-4 w-4 text-on-surface-variant/30" />
                )}
              </div>
            </div>
          </div>

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
              {isEditing ? "Save Changes" : "Create Product"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
