"use client";

import { useState } from "react";
import { BookOpen, Plus, Search, Eye, ThumbsUp, Pencil, Trash2, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import {
  Table, TableHeader, TableHeaderRow, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import {
  useKbArticles, useKbCategories, useCreateArticle, useUpdateArticle, useDeleteArticle,
} from "@/hooks/use-knowledge-base";
import { usePageTitle } from "@/hooks/use-page-title";

export default function KnowledgeBasePage() {
  usePageTitle("Knowledge Base");

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            Knowledge Base
          </h1>
          <p className="text-[13px] text-on-surface-variant mt-0.5">Manage help articles for your team and customers</p>
        </div>
        <Button onClick={() => { resetForm(); setEditId(null); setShowCreate(true); }}>
          <Plus className="h-4 w-4 mr-1" /> New Article
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/50" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            placeholder="Search articles..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-outline-variant/30 bg-surface text-[13px] text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
          className="rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none"
        >
          <option value="">All Categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c._count.articles})</option>
          ))}
        </select>
      </div>

      {/* Articles table */}
      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner size="lg" className="text-primary" /></div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="No articles yet"
          description="Create your first knowledge base article."
          actionLabel="New Article"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableHeaderRow>
                <TableHead>Title</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Views</TableHead>
                <TableHead>Helpful</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead>Actions</TableHead>
              </TableHeaderRow>
            </TableHeader>
            <TableBody>
              {data.data.map((article) => (
                <TableRow key={article.id}>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="text-[13px] font-medium text-on-surface truncate max-w-[250px]">{article.title}</p>
                      {article.tags.length > 0 && (
                        <div className="flex gap-1 mt-0.5">
                          {article.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] text-on-surface-variant/60 bg-surface-container-high rounded px-1">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-on-surface-variant">{article.category?.name || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {article.isPublished ? (
                        <Badge variant="success"><Globe className="h-3 w-3 mr-0.5" />Published</Badge>
                      ) : (
                        <Badge variant="muted">Draft</Badge>
                      )}
                      {article.isInternal && <Badge variant="warning"><Lock className="h-3 w-3 mr-0.5" />Internal</Badge>}
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] text-on-surface-variant">
                    <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{article.viewCount}</span>
                  </TableCell>
                  <TableCell className="text-[12px] text-on-surface-variant">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{article.helpfulCount}</span>
                  </TableCell>
                  <TableCell className="text-[11px] text-on-surface-variant">
                    {new Date(article.updatedAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(article)} className="p-1 rounded text-on-surface-variant hover:text-primary transition-colors"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => deleteArticle.mutate(article.id)} className="p-1 rounded text-on-surface-variant hover:text-error transition-colors"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {data.total > take && <Pagination total={data.total} totalPages={Math.ceil(data.total / take)} page={page} onPageChange={setPage} />}
        </>
      )}

      {/* Create/Edit Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-scrim/40">
          <div className="w-full max-w-2xl rounded-3xl bg-surface shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/15">
              <h2 className="text-lg font-semibold text-on-surface">{editId ? "Edit Article" : "New Article"}</h2>
              <button onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }} className="p-1 rounded-lg text-on-surface-variant hover:text-error">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Article title" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              <select value={form.categoryId} onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none">
                <option value="">No category</option>
                {categories?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} placeholder="Article content (Markdown supported)" rows={10} className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono" />
              <input value={form.tags} onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))} placeholder="Tags (comma-separated)" className="w-full rounded-xl border border-outline-variant/30 bg-surface px-3 py-2 text-[13px] focus:border-primary focus:outline-none" />
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.isPublished} onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))} className="rounded" />
                  Published
                </label>
                <label className="flex items-center gap-2 text-[13px] cursor-pointer">
                  <input type="checkbox" checked={form.isInternal} onChange={(e) => setForm((f) => ({ ...f, isInternal: e.target.checked }))} className="rounded" />
                  Internal Only
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-6 py-4 border-t border-outline-variant/15">
              <Button variant="ghost" onClick={() => { setShowCreate(false); setEditId(null); resetForm(); }}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={!form.title.trim() || !form.body.trim()}>
                {editId ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
