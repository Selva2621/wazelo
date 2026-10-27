"use client";

import { useState } from "react";
import { BookOpen, Plus, Eye, ThumbsUp, Pencil, Trash2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { FilterBar, FilterSelect } from "@/components/ui/filter-bar";
import { SearchInput } from "@/components/ui/search-input";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useKbArticles, useKbCategories, useCreateArticle, useUpdateArticle, useDeleteArticle,
} from "@/hooks/use-knowledge-base";
import { usePageTitle } from "@/hooks/use-page-title";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";

export default function KnowledgeBasePage() {
  usePageTitle("Knowledge base");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [page, setPage] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", slug: "", body: "", categoryId: "", isPublished: false, isInternal: false, tags: "" });
  const take = 20;

  const { data: categories } = useKbCategories();
  const { data, isLoading } = useKbArticles({
    categoryId: categoryFilter || undefined,
    search: search || undefined,
    take,
    skip: page * take,
  });
  const createArticle = useCreateArticle();
  const updateArticle = useUpdateArticle();
  const deleteArticle = useDeleteArticle();

  const handleSubmit = () => {
    const payload = {
      title: form.title,
      slug: form.slug || form.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
      body: form.body,
      categoryId: form.categoryId || undefined,
      isPublished: form.isPublished,
      isInternal: form.isInternal,
      tags: form.tags ? form.tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
    };

    if (editId) {
      updateArticle.mutate({ id: editId, ...payload }, {
        onSuccess: () => { setEditId(null); setShowCreate(false); resetForm(); },
      });
    } else {
      createArticle.mutate(payload, {
        onSuccess: () => { setShowCreate(false); resetForm(); },
      });
    }
  };

  const resetForm = () => setForm({ title: "", slug: "", body: "", categoryId: "", isPublished: false, isInternal: false, tags: "" });

  const startEdit = (article: any) => {
    setForm({
      title: article.title,
      slug: article.slug,
      body: article.body,
      categoryId: article.categoryId || "",
      isPublished: article.isPublished,
      isInternal: article.isInternal,
      tags: article.tags?.join(", ") || "",
    });
    setEditId(article.id);
    setShowCreate(true);
  };

  const columns: DataTableColumn<NonNullable<typeof data>["data"][number]>[] = [
    {
      id: "title",
      header: "Title",
      cell: (article) => (
        <div className="min-w-0">
          <p className="text-body font-medium text-on-surface truncate max-w-[250px]">{article.title}</p>
          {article.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {article.tags.slice(0, 3).map((t) => (
                <span key={t} className="text-caption text-on-surface-variant/60 bg-surface-container-high rounded px-1">{t}</span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cellClassName: "text-label text-on-surface-variant",
      cell: (article) => article.category?.name || "—",
    },
    {
      id: "status",
      header: "Status",
      skeleton: "badge",
      cell: (article) => (
        <div className="flex items-center gap-1">
          {article.isPublished ? (
            <Badge variant="success"><Globe className="h-3 w-3 mr-0.5" />Published</Badge>
          ) : (
            <Badge variant="muted">Draft</Badge>
          )}
          {article.isInternal && <Badge variant="warning"><Lock className="h-3 w-3 mr-0.5" />Internal</Badge>}
        </div>
      ),
    },
    {
      id: "views",
      header: "Views",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant",
      cell: (article) => <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.viewCount}</span>,
    },
    {
      id: "helpful",
      header: "Helpful",
      skeleton: "short",
      cellClassName: "text-label text-on-surface-variant",
      cell: (article) => <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{article.helpfulCount}</span>,
    },
    {
      id: "updated",
      header: "Updated",
      skeleton: "short",
      cellClassName: "text-caption text-on-surface-variant",
      cell: (article) => new Date(article.updatedAt).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "Actions",
      skeleton: "none",
      cell: (article) => (
        <div className="flex items-center gap-1">
          <IconButton size="xs" onClick={() => startEdit(article)} className="hover:text-primary" aria-label="Edit"><Pencil className="h-3.5 w-3.5" /></IconButton>
          <IconButton size="xs" variant="danger" onClick={() => deleteArticle.mutate(article.id)} aria-label="Delete"><Trash2 className="h-3.5 w-3.5" /></IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <MobilePageActions primary={{ label: "New article", onClick: () => { resetForm(); setEditId(null); setShowCreate(true); } }} />
      <PageHeader
        className="max-lg:hidden"
        title="Knowledge base"
        count={data?.total}
        actions={
          <>
            <SearchInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              placeholder="Search articles"
              className="w-64"
            />
            <Button onClick={() => { resetForm(); setEditId(null); setShowCreate(true); }}>
              <Plus className="mr-1 h-4 w-4" /> New article
            </Button>
          </>
        }
      />

      {/* Filters (phones/tablets: search sits here, the nav bar has the title) */}
      <FilterBar className="max-lg:flex-nowrap max-lg:px-4">
        <SearchInput
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          placeholder="Search articles"
          className="min-w-0 flex-1 lg:hidden"
        />
        <FilterSelect
          label="Category"
          active={categoryFilter !== ""}
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          className="max-lg:max-w-[45vw]"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c._count.articles})</option>
          ))}
        </FilterSelect>
      </FilterBar>

      {/* Articles table */}
      <DataTable
        label="Articles"
        columns={columns}
        rows={data?.data ?? []}
        rowKey={(article) => article.id}
        rowLabel={(article) => article.title}
        loading={isLoading}
        skeletonRows={6}
        pagination={{ page, pageSize: take, total: data?.total ?? 0, onPageChange: setPage }}
        empty={{
          icon: <BookOpen className="h-12 w-12" />,
          title: "No articles yet",
          description: "Create your first knowledge base article.",
          actionLabel: "New article",
          onAction: () => setShowCreate(true),
        }}
      />

      {/* Create/Edit Modal */}
      <Modal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditId(null); resetForm(); }}
        aria-labelledby="kb-article-modal-title"
        className="max-w-2xl rounded-3xl bg-surface max-h-[90vh] flex flex-col overflow-hidden"
      >
        {() => (
          <>
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <h2 id="kb-article-modal-title" className="text-title font-semibold text-on-surface">{editId ? "Edit article" : "New article"}</h2>
              <button aria-label="Close" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }} className="p-1 rounded-lg text-on-surface-variant hover:text-error">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Article title" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body focus:border-primary focus:outline-none">
                <option value="">No category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Article content (Markdown supported)" rows={10} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono" />
              <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-body focus:border-primary focus:outline-none" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-body cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                  Published
                </label>
                <label className="flex items-center gap-2 text-body cursor-pointer">
                  <input type="checkbox" checked={form.isInternal} onChange={(e) => setForm((f) => ({ ...f, isInternal: e.target.checked }))} className="rounded" />
                  Internal only
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
              <Button variant="ghost" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.body.trim()}>
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
