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
import { PageHeader } from "@/components/layout/page-header";
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
import { IconButton } from "@/components/ui/icon-button";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";

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

  // Mobile: category edit/delete live in the "…" sheet (no hover on touch)
  const activeCategory = (categories ?? []).find((c) => c.id === activeCategoryTab);

  return (
    <div className="space-y-4 max-lg:px-4 max-lg:pb-4">
      <MobilePageActions
        primary={{ label: "New Product", onClick: openCreate }}
        more={[
          { label: "New Category", onSelect: () => { setEditCategory(undefined); setCategoryModalOpen(true); } },
          activeCategory && { label: `Edit "${activeCategory.name}"`, onSelect: () => { setEditCategory(activeCategory); setCategoryModalOpen(true); } },
          activeCategory && { label: `Delete "${activeCategory.name}"`, destructive: true, onSelect: () => setDeleteCatTarget(activeCategory) },
        ]}
      />
      {/* Header */}
      <PageHeader
        title="Products"
        count={products?.length}
        className="max-lg:hidden"
        actions={
          <>
            <Button variant="secondary" onClick={() => { setEditCategory(undefined); setCategoryModalOpen(true); }}>
              <Tag className="h-4 w-4 mr-1" /> New category
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New product
            </Button>
          </>
        }
      />

      {/* Category filter tabs */}
      {(categories ?? []).length > 0 && (
        <div className="flex items-center gap-1 flex-wrap mobile-scroll-x">
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
                type="button"
                onClick={() => setActiveCategoryTab(tab.id)}
                aria-pressed={activeCategoryTab === tab.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-label font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-focus ${
                  activeCategoryTab === tab.id
                    ? "bg-primary/10 text-primary"
                    : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                }`}
              >
                {tab.color && (
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ background: tab.color }} />
                )}
                {tab.label}
                <span className="text-caption tabular-nums opacity-60">{tab.count}</span>
              </button>
              {tab.id !== "ALL" && tab.id !== "NONE" && (
                <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 flex items-center gap-0.5 transition-opacity max-lg:hidden">
                  <IconButton size="xs"
                    onClick={() => { setEditCategory((categories ?? []).find((c) => c.id === tab.id)); setCategoryModalOpen(true); }}
                    className="hover:text-primary"
                    title="Edit category" aria-label="Edit category">
                    <Pencil className="h-3 w-3" />
                  </IconButton>
                  <IconButton size="xs" variant="danger"
                    onClick={() => setDeleteCatTarget((categories ?? []).find((c) => c.id === tab.id) ?? null)}
                   
                    title="Delete category" aria-label="Delete category">
                    <Trash2 className="h-3 w-3" />
                  </IconButton>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      {(products ?? []).length > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant max-w-sm focus-within:ring-2 focus-within:ring-focus">
          <Search className="h-4 w-4 text-on-surface-variant/60" aria-hidden />
          <input
            aria-label="Search products"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products…"
            className="flex-1 bg-transparent text-body text-on-surface outline-none placeholder:text-on-surface-variant/40"
          />
        </div>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <div className="rounded-2xl border border-outline-variant overflow-hidden">
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
                        <p className="text-body font-medium text-on-surface truncate">{product.name}</p>
                        {product.description && (
                          <p className="text-caption text-on-surface-variant/60 truncate max-w-[200px]">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-label text-on-surface-variant font-mono">
                    {product.sku || "—"}
                  </TableCell>

                  <TableCell>
                    {product.category ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-surface-container">
                        {product.category.color && (
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: product.category.color }} />
                        )}
                        {product.category.name}
                      </span>
                    ) : (
                      <span className="text-label text-on-surface-variant/40">—</span>
                    )}
                  </TableCell>

                  <TableCell className="text-body font-medium text-on-surface">
                    {formatPrice(product.price, product.currency)}
                  </TableCell>

                  <TableCell>
                    <button
                      type="button"
                      onClick={() => toggleStatus(product)}
                      title="Toggle status"
                      aria-label={`${product.name}: ${product.status === "ACTIVE" ? "active" : "inactive"}. Toggle status`}
                      className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
                    >
                      <Badge variant={product.status === "ACTIVE" ? "success" : "muted"}>
                        {product.status === "ACTIVE"
                          ? <ToggleRight className="h-3 w-3 mr-1" />
                          : <ToggleLeft className="h-3 w-3 mr-1" />}
                        {product.status}
                      </Badge>
                    </button>
                  </TableCell>

                  <TableCell className="text-label text-on-surface-variant">
                    {new Date(product.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <IconButton size="xs"
                        onClick={() => openEdit(product)}
                        className="hover:text-primary hover:bg-primary/10"
                        title="Edit product" aria-label="Edit product">
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton size="xs" variant="danger"
                        onClick={() => setDeleteTarget(product)}
                       
                        title="Delete product" aria-label="Delete product">
                        <Trash2 className="h-3.5 w-3.5" />
                      </IconButton>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (products ?? []).length > 0 ? (
        <p className="text-body text-on-surface-variant/50 text-center py-8">
          No products match your filters
        </p>
      ) : (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products yet"
          description="Create products to assign to contacts, deals, chatbot flows, and sequences"
          actionLabel="New product"
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
        title="Delete product"
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
        title="Delete category"
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
