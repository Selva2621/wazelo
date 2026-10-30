"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Package,
  Trash2,
  Pencil,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { FilterBar, FilterBarDivider } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
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
import { useProductTerms } from "@/lib/product-terms";

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
  const terms = useProductTerms();
  usePageTitle(terms.Plural);

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

  const columns: DataTableColumn<Product>[] = [
    {
      id: "product",
      header: terms.Singular,
      skeleton: "avatar",
      cell: (product) => (
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
      ),
    },
    {
      id: "sku",
      header: "SKU",
      cellClassName: "text-label text-on-surface-variant font-mono",
      cell: (product) => product.sku || "—",
    },
    {
      id: "category",
      header: "Category",
      skeleton: "badge",
      cell: (product) =>
        product.category ? (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-caption font-medium bg-surface-container">
            {product.category.color && (
              <span className="h-2 w-2 rounded-full shrink-0" style={{ background: product.category.color }} />
            )}
            {product.category.name}
          </span>
        ) : (
          <span className="text-label text-on-surface-variant/40">—</span>
        ),
    },
    {
      id: "price",
      header: "Price",
      skeleton: "short",
      cellClassName: "text-body font-medium text-on-surface",
      cell: (product) => formatPrice(product.price, product.currency),
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (product) => (
        <button
          type="button"
          onClick={() => toggleStatus(product)}
          title="Toggle status"
          aria-label={`${product.name}: ${product.status === "ACTIVE" ? "active" : "inactive"}. Toggle status`}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-focus"
        >
          <Badge variant={product.status === "ACTIVE" ? "success" : "muted"} dot>
            {product.status === "ACTIVE" ? "Active" : "Inactive"}
          </Badge>
        </button>
      ),
    },
    {
      id: "created",
      header: "Created",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant",
      cell: (product) =>
        new Date(product.createdAt).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        }),
    },
    {
      id: "actions",
      header: "Actions",
      align: "right",
      skeleton: "none",
      cell: (product) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton size="xs"
            onClick={() => openEdit(product)}
            className="hover:text-primary hover:bg-primary/10"
            title={`Edit ${terms.singular}`} aria-label={`Edit ${terms.singular}`}>
            <Pencil className="h-3.5 w-3.5" />
          </IconButton>
          <IconButton size="xs" variant="danger"
            onClick={() => setDeleteTarget(product)}
            title={`Delete ${terms.singular}`} aria-label={`Delete ${terms.singular}`}>
            <Trash2 className="h-3.5 w-3.5" />
          </IconButton>
        </div>
      ),
    },
  ];

  if (productsLoading || catsLoading) {
    return <div className="flex justify-center py-12"><Spinner size="lg" /></div>;
  }

  // Mobile: category edit/delete live in the "…" sheet (no hover on touch)
  const activeCategory = (categories ?? []).find((c) => c.id === activeCategoryTab);

  return (
    // Desktop: room around the page, like the other list pages
    <div className="space-y-4 max-lg:px-4 max-lg:pb-4 lg:p-6">
      <MobilePageActions
        primary={{ label: `New ${terms.singular}`, onClick: openCreate }}
        more={[
          { label: "New Category", onSelect: () => { setEditCategory(undefined); setCategoryModalOpen(true); } },
          activeCategory && { label: `Edit "${activeCategory.name}"`, onSelect: () => { setEditCategory(activeCategory); setCategoryModalOpen(true); } },
          activeCategory && { label: `Delete "${activeCategory.name}"`, destructive: true, onSelect: () => setDeleteCatTarget(activeCategory) },
        ]}
      />
      {/* Header */}
      <PageHeader
        title={terms.Plural}
        count={products?.length}
        className="max-lg:hidden"
        actions={
          <>
            {(products ?? []).length > 0 && (
              <SearchInput
                aria-label={`Search ${terms.plural}`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${terms.plural}`}
                className="w-64"
              />
            )}
            <Button variant="secondary" onClick={() => { setEditCategory(undefined); setCategoryModalOpen(true); }}>
              <Tag className="h-4 w-4 mr-1" /> New category
            </Button>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" /> New {terms.singular}
            </Button>
          </>
        }
      />

      {/* Search on phones (desktop: in the header) */}
      {(products ?? []).length > 0 && (
        <SearchInput
          aria-label={`Search ${terms.plural}`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Search ${terms.plural}`}
          className="w-full lg:hidden"
        />
      )}

      {/* Category chips; the chosen category's edit/delete sit beside them (phones: "…" sheet) */}
      {(categories ?? []).length > 0 && (
        <FilterBar className="mobile-scroll-x">
          <Tabs
            tabs={[
              { id: "ALL", label: "All", count: (products ?? []).length },
              ...(categories ?? []).map((c) => ({
                id: c.id,
                label: c.name,
                count: (products ?? []).filter((p) => p.categoryId === c.id).length,
              })),
              ...(uncategorizedCount > 0
                ? [{ id: "NONE", label: "Uncategorized", count: uncategorizedCount }]
                : []),
            ]}
            activeTab={activeCategoryTab}
            onTabChange={setActiveCategoryTab}
          />
          {activeCategory && (
            <>
              <FilterBarDivider />
              <div className="flex items-center gap-0.5 max-lg:hidden">
                <IconButton size="xs"
                  onClick={() => { setEditCategory(activeCategory); setCategoryModalOpen(true); }}
                  className="hover:text-primary"
                  title={`Edit "${activeCategory.name}"`} aria-label={`Edit category ${activeCategory.name}`}>
                  <Pencil className="h-3.5 w-3.5" />
                </IconButton>
                <IconButton size="xs" variant="danger"
                  onClick={() => setDeleteCatTarget(activeCategory)}
                  title={`Delete "${activeCategory.name}"`} aria-label={`Delete category ${activeCategory.name}`}>
                  <Trash2 className="h-3.5 w-3.5" />
                </IconButton>
              </div>
            </>
          )}
        </FilterBar>
      )}

      {/* Table */}
      {filtered.length > 0 ? (
        <DataTable
          label={terms.Plural}
          columns={columns}
          rows={filtered}
          rowKey={(product) => product.id}
          rowLabel={(product) => product.name}
        />
      ) : (products ?? []).length > 0 ? (
        <p className="text-body text-on-surface-variant/50 text-center py-8">
          No {terms.plural} match your filters
        </p>
      ) : (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title={`No ${terms.plural} yet`}
          description={`Create ${terms.plural} to assign to contacts, deals, chatbot flows, and sequences`}
          actionLabel={`New ${terms.singular}`}
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
        title={`Delete ${terms.singular}`}
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
        message={`Delete "${deleteCatTarget?.name}"? ${terms.Plural} in this category will become uncategorized.`}
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
