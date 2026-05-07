"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Package,
  Trash2,
  Pencil,
  Search,
  ToggleLeft,
  ToggleRight,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Spinner } from "@/components/ui/spinner";
import { usePageTitle } from "@/hooks/use-page-title";
import {
  useProducts,
  useUpdateProduct,
  useDeleteProduct,
  useProductCategories,
  useDeleteProductCategory,
} from "@/hooks/use-products";
import { ProductFormModal } from "@/components/products/product-form-modal";
import { CategoryFormModal } from "@/components/products/category-form-modal";
import type { Product, ProductCategory } from "@/lib/types/products";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPrice(price: string | null, currency: string | null) {
  if (!price) return "—";
  const num = parseFloat(price);
  const symbol =
    currency === "INR" ? "₹" :
    currency === "USD" ? "$" :
    currency === "EUR" ? "€" :
    currency === "GBP" ? "£" :
    (currency ?? "") + " ";
  return `${symbol}${num.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProductsPage() {
  usePageTitle("Products");

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: categories, isLoading: catsLoading } = useProductCategories();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const deleteCategory = useDeleteProductCategory();

  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | undefined>(undefined);

  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editCategory, setEditCategory] = useState<ProductCategory | undefined>(undefined);

  const [activeCategoryTab, setActiveCategoryTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleteCatTarget, setDeleteCatTarget] = useState<ProductCategory | null>(null);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products;
    if (activeCategoryTab !== "ALL") {
      list = list.filter((p) =>
        activeCategoryTab === "NONE" ? !p.categoryId : p.categoryId === activeCategoryTab
      );
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [products, activeCategoryTab, search]);

  const uncategorizedCount = useMemo(
    () => (products ?? []).filter((p) => !p.categoryId).length,
    [products]
  );

  function openCreate() {
    setEditProduct(undefined);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditProduct(p);
    setModalOpen(true);
  }

  function toggleStatus(p: Product) {
    updateProduct.mutate({ id: p.id, status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" });
  }

  if (productsLoading || catsLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <Package className="h-6 w-6 text-primary" />
            Products
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">
            Manage products and assign them to contacts, deals, and sequences
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => { setEditCategory(undefined); setCategoryModalOpen(true); }}>
            <Tag className="h-4 w-4 mr-1" /> New Category
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> New Product
          </Button>
        </div>
      </div>

      {/* Category filter tabs */}
      {(categories ?? []).length > 0 && (
        <div className="flex items-center gap-1 flex-wrap">
          {[
            { id: "ALL", label: "All", count: (products ?? []).length, color: null },
            ...(categories ?? []).map((c) => ({
              id: c.id,
              label: c.name,
              count: (products ?? []).filter((p) => p.categoryId === c.id).length,
              color: c.color,
            })),
            ...(uncategorizedCount > 0
              ? [{ id: "NONE", label: "Uncategorized", count: uncategorizedCount, color: null }]
              : []),
          ].map((tab) => (
            <div key={tab.id} className="flex items-center gap-0.5 group">
              <button
                onClick={() => setActiveCategoryTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-colors ${
                  activeCategoryTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {tab.color && (
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: tab.color }} />
                )}
                {tab.label}
                <span className="text-[10px] opacity-60">({tab.count})</span>
              </button>
              {tab.id !== "ALL" && tab.id !== "NONE" && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                  <button
                    onClick={() => { setEditCategory((categories ?? []).find((c) => c.id === tab.id)); setCategoryModalOpen(true); }}
                    className="p-1 rounded text-on-surface-variant/50 hover:text-primary transition-colors"
                    title="Edit category"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => setDeleteCatTarget((categories ?? []).find((c) => c.id === tab.id) ?? null)}
                    className="p-1 rounded text-on-surface-variant/50 hover:text-error transition-colors"
                    title="Delete category"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {(products ?? []).length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container border border-outline-variant/10 max-w-sm">
          <Search className="h-4 w-4 text-on-surface-variant/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-[13px] text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-2xl border border-outline-variant/10 overflow-hidden">
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead align="right">Actions</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {filtered.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-8 h-8 rounded-lg object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-on-surface truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-[11px] text-on-surface-variant/60 truncate max-w-[200px]">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-[12px] text-on-surface-variant font-mono">
                    {product.sku || "—"}
                  </TableCell>

                  <TableCell>
                    {product.category ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-surface-container border border-outline-variant/10">
                        {product.category.color && (
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: product.category.color }} />
                        )}
                        {product.category.name}
                      </span>
                    ) : (
                      <span className="text-[12px] text-on-surface-variant/40">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-[13px] font-medium text-on-surface">
                    {formatPrice(product.price, product.currency)}
                  </TableCell>

                  <TableCell>
                    <button onClick={() => toggleStatus(product)} title="Toggle status">
                      <Badge variant={product.status === "ACTIVE" ? "success" : "muted"}>
                        {product.status === "ACTIVE"
                          ? <ToggleRight className="h-3 w-3 mr-1" />
                          : <ToggleLeft className="h-3 w-3 mr-1" />}
                        {product.status}
                      </Badge>
                    </button>
                  </TableCell>

                  <TableCell className="text-[12px] text-on-surface-variant">
                    {new Date(product.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(product)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(product)}
                        className="p-1.5 rounded-lg text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (products ?? []).length > 0 ? (
        <p className="text-[13px] text-on-surface-variant/50 text-center py-8">
          No products match your filters
        </p>
      ) : (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products yet"
          description="Create products to assign to contacts, deals, chatbot flows, and sequences"
          actionLabel="Create Product"
          onAction={openCreate}
        />
      )}

      {/* Product form modal */}
      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editProduct}
      />

      {/* Category form modal */}
      <CategoryFormModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        category={editCategory}
      />

      {/* Delete product */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Product"
        message={`Are you sure you want to delete "${deleteTarget?.name}"? This will remove it from all contacts and deals.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteProduct.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteProduct.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Delete category */}
      <ConfirmDialog
        open={!!deleteCatTarget}
        title="Delete Category"
        message={`Delete "${deleteCatTarget?.name}"? Products in this category will become uncategorized.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleteCategory.isPending}
        onConfirm={() => {
          if (deleteCatTarget) deleteCategory.mutate(deleteCatTarget.id, { onSuccess: () => setDeleteCatTarget(null) });
        }}
        onCancel={() => setDeleteCatTarget(null)}
      />
    </div>
  );
}
