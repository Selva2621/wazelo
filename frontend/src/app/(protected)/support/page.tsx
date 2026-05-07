"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, Plus, X, Loader2, ChevronRight, ArrowLeft, Send,
  ImageIcon, ChevronLeft, MessageSquare, Tag, AlertCircle, Clock,
  Paperclip, CheckCircle2, Circle, RefreshCw,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Spinner } from "@/components/ui/spinner";
import { PAGE_SIZE } from "@/lib/constants";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["GENERAL", "BILLING", "TECHNICAL", "FEATURE_REQUEST"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// ─── API ──────────────────────────────────────────────────────────────────────

const ticketApi = {
  list: (params: { page: number; limit: number }) =>
    apiClient.get<any>("/super-admin/tickets", { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<any>(`/super-admin/tickets/${id}`).then((r) => r.data),
  create: (data: { title: string; description: string; category: string; priority: string; attachmentUrl?: string }) =>
    apiClient.post<any>("/super-admin/tickets", data).then((r) => r.data),
  reply: (id: string, body: string) =>
    apiClient.post<any>(`/super-admin/tickets/${id}/replies`, { body }).then((r) => r.data),
  uploadFile: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await apiClient.post<any>("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
    return r.data as { url: string; filename: string };
  },
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useTickets(page: number) {
  return useQuery({
    queryKey: ["support", "tickets", page],
    queryFn: () => ticketApi.list({ page, limit: PAGE_SIZE }),
  });
}

function useTicket(id: string | null) {
  return useQuery({
    queryKey: ["support", "ticket", id],
    queryFn: () => ticketApi.get(id!),
    enabled: !!id,
  });
}

function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ticketApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support", "tickets"] }),
  });
}

function useReply(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => ticketApi.reply(ticketId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support", "ticket", ticketId] }),
  });
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  OPEN:        { label: "Open",        className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",  icon: <Circle className="h-3 w-3" /> },
  IN_PROGRESS: { label: "In Progress", className: "bg-blue-500/10 text-blue-400 border-blue-500/20",           icon: <RefreshCw className="h-3 w-3" /> },
  RESOLVED:    { label: "Resolved",    className: "bg-violet-500/10 text-violet-400 border-violet-500/20",     icon: <CheckCircle2 className="h-3 w-3" /> },
  CLOSED:      { label: "Closed",      className: "bg-surface-container text-on-surface-variant border-outline-variant", icon: <X className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<string, { className: string; dot: string }> = {
  LOW:    { className: "text-on-surface-variant", dot: "bg-on-surface-variant/40" },
  MEDIUM: { className: "text-blue-400",           dot: "bg-blue-400" },
  HIGH:   { className: "text-orange-400",         dot: "bg-orange-400" },
  URGENT: { className: "text-red-400",            dot: "bg-red-400" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CLOSED;
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {priority}
    </span>
  );
}

function AuthImage({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg px-3 py-2 w-fit">
      <ImageIcon className="h-3.5 w-3.5" /> Failed to load image
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="attachment" className={className} onError={() => setFailed(true)} />
    </a>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, total, onPage }: { page: number; totalPages: number; total: number; onPage: (p: number) => void }) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
      <p className="text-xs text-on-surface-variant">{total} ticket{total !== 1 ? "s" : ""}</p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-1 text-on-surface-variant text-xs">…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p as number)}
              className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                p === page
                  ? "bg-primary text-on-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
              }`}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── New Ticket Modal ─────────────────────────────────────────────────────────

function NewTicketModal({ onClose }: { onClose: () => void }) {
  const create = useCreateTicket();
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "GENERAL" as typeof CATEGORIES[number],
    priority: "MEDIUM" as typeof PRIORITIES[number],
  });
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearImage = () => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    let attachmentUrl: string | undefined;
    if (imageFile) {
      try {
        setUploading(true);
        const result = await ticketApi.uploadFile(imageFile);
        attachmentUrl = result.url;
      } catch {
        setError("Failed to upload image. Please try again.");
        setUploading(false);
        return;
      } finally {
        setUploading(false);
      }
    }
    create.mutate({ ...form, attachmentUrl }, {
      onSuccess: () => onClose(),
      onError: (err: any) => setError(err?.response?.data?.message ?? "Failed to create ticket"),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-[#0f1117] border border-outline-variant rounded-2xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <h2 className="font-semibold text-on-surface text-sm">New Support Ticket</h2>
          </div>
          <button onClick={onClose} className="text-on-surface-variant hover:text-on-surface transition-colors p-1 rounded-lg hover:bg-surface-container">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={255}
              placeholder="Briefly describe the issue"
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={4}
              placeholder="Explain the issue in detail..."
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-colors"
            />
          </div>

          {/* Image upload */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wide">
              Attachment <span className="normal-case font-normal text-on-surface-variant/50">(optional · max 16 MB)</span>
            </label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative w-fit group">
                <img src={imagePreview} alt="preview" className="max-h-28 rounded-xl border border-outline-variant object-contain bg-surface-container" />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-surface-container-high border border-outline-variant rounded-full p-0.5 text-on-surface-variant hover:text-error transition-colors shadow-sm"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full border border-dashed border-outline-variant rounded-xl px-4 py-3 text-sm text-on-surface-variant hover:text-on-surface hover:border-primary/50 hover:bg-surface-container transition-colors"
              >
                <Paperclip className="h-4 w-4" />
                Click to attach an image
              </button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-outline-variant rounded-xl py-2.5 text-sm font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || uploading}
              className="flex-1 bg-primary text-on-primary rounded-xl py-2.5 text-sm font-semibold hover:bg-primary/90 disabled:opacity-60 flex items-center justify-center gap-2 transition-colors"
            >
              {(uploading || create.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? "Uploading…" : create.isPending ? "Submitting…" : "Submit Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const reply = useReply(ticketId);
  const [body, setBody] = useState("");

  const handleReply = () => {
    if (!body.trim()) return;
    reply.mutate(body, { onSuccess: () => setBody("") });
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <Spinner />
    </div>
  );
  if (!ticket) return null;

  const isClosed = ticket.status === "CLOSED" || ticket.status === "RESOLVED";

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - var(--header-height))" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-outline-variant flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <span className="text-outline-variant">|</span>
        <StatusBadge status={ticket.status} />
        <span className="text-xs text-on-surface-variant ml-auto">
          #{ticket.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main: conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Ticket header */}
          <div className="px-6 py-5 border-b border-outline-variant flex-shrink-0">
            <h1 className="text-base font-semibold text-on-surface leading-snug">{ticket.title}</h1>
            <div className="flex items-center flex-wrap gap-3 mt-2">
              <PriorityDot priority={ticket.priority} />
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Tag className="h-3 w-3" /> {ticket.category.replace("_", " ")}
              </span>
              <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                <Clock className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {ticket._count?.replies !== undefined && (
                <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                  <MessageSquare className="h-3 w-3" /> {ticket._count.replies} replies
                </span>
              )}
            </div>
          </div>

          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Original message */}
            <div className="flex justify-start">
              <div className="max-w-[75%]">
                <div className="text-xs text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                  <span className="font-medium text-on-surface">You</span>
                  <span>·</span>
                  <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                  {ticket.attachmentUrl && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/50">
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 mb-2">
                        <Paperclip className="h-3 w-3" /> Attachment
                      </p>
                      <AuthImage
                        url={ticket.attachmentUrl}
                        className="max-h-48 rounded-xl border border-outline-variant object-contain bg-surface-container hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Replies */}
            {ticket.replies?.map((r: any) => {
              const isSupport = !!r.superAdmin;
              return (
                <div key={r.id} className={`flex ${isSupport ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[75%]`}>
                    <div className={`text-xs text-on-surface-variant mb-1.5 flex items-center gap-1.5 ${isSupport ? "justify-end" : ""}`}>
                      <span className="font-medium text-on-surface">{isSupport ? "Support Team" : "You"}</span>
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`border rounded-2xl px-4 py-3 ${
                      isSupport
                        ? "bg-primary/10 border-primary/20 rounded-tr-sm"
                        : "bg-surface-container border-outline-variant rounded-tl-sm"
                    }`}>
                      <p className="text-sm text-on-surface whitespace-pre-wrap leading-relaxed">{r.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {isClosed && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-outline-variant" />
                <span className="text-xs text-on-surface-variant">Ticket {ticket.status.toLowerCase()}</span>
                <div className="flex-1 h-px bg-outline-variant" />
              </div>
            )}
          </div>

          {/* Reply box */}
          {!isClosed && (
            <div className="px-6 py-4 border-t border-outline-variant flex-shrink-0">
              <div className="bg-surface-container border border-outline-variant rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary/50 transition-all">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleReply(); }}
                  rows={3}
                  placeholder="Write a reply… (Ctrl+Enter to send)"
                  className="w-full bg-transparent px-4 pt-3 pb-1 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end px-3 py-2">
                  <button
                    onClick={handleReply}
                    disabled={!body.trim() || reply.isPending}
                    className="bg-primary text-on-primary text-xs font-semibold px-4 py-2 rounded-xl hover:bg-primary/90 disabled:opacity-40 flex items-center gap-1.5 transition-colors"
                  >
                    {reply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send Reply
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: ticket meta */}
        <div className="w-64 border-l border-outline-variant flex-shrink-0 px-5 py-5 space-y-5 overflow-y-auto hidden lg:block">
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Status</p>
            <StatusBadge status={ticket.status} />
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Priority</p>
            <PriorityDot priority={ticket.priority} />
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Category</p>
            <p className="text-sm text-on-surface">{ticket.category.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Opened</p>
            <p className="text-sm text-on-surface">{new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          {ticket.closedAt && (
            <div>
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wide mb-2">Closed</p>
              <p className="text-sm text-on-surface">{new Date(ticket.closedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket List (DataTable) ──────────────────────────────────────────────────

function TicketTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTickets(page);

  const tickets: any[] = data?.tickets ?? [];
  const totalPages: number = data?.totalPages ?? 1;
  const total: number = data?.total ?? 0;

  return (
    <div className="border border-outline-variant rounded-2xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-surface-container/60 border-b border-outline-variant text-xs text-on-surface-variant font-medium uppercase tracking-wide">
            <th className="text-left px-5 py-3">Ticket</th>
            <th className="text-left px-4 py-3 hidden sm:table-cell">Category</th>
            <th className="text-left px-4 py-3 hidden md:table-cell">Priority</th>
            <th className="text-left px-4 py-3">Status</th>
            <th className="text-left px-4 py-3 hidden lg:table-cell">Replies</th>
            <th className="text-left px-4 py-3 hidden lg:table-cell">Date</th>
            <th className="px-4 py-3 w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant/50">
          {isLoading ? (
            <tr>
              <td colSpan={7} className="py-16 text-center">
                <Spinner className="mx-auto text-primary" />
              </td>
            </tr>
          ) : tickets.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-16 text-center">
                <LifeBuoy className="h-10 w-10 mx-auto mb-3 text-on-surface-variant opacity-20" />
                <p className="font-medium text-on-surface">No tickets yet</p>
                <p className="text-xs text-on-surface-variant mt-1">Create a ticket and we'll get back to you.</p>
              </td>
            </tr>
          ) : tickets.map((t) => (
            <tr
              key={t.id}
              onClick={() => onSelect(t.id)}
              className="hover:bg-surface-container/50 cursor-pointer transition-colors group"
            >
              <td className="px-5 py-3.5 max-w-[220px]">
                <div className="flex items-start gap-2">
                  {t.attachmentUrl && <Paperclip className="h-3.5 w-3.5 text-on-surface-variant flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="font-medium text-on-surface truncate group-hover:text-primary transition-colors">{t.title}</p>
                    <p className="text-xs text-on-surface-variant mt-0.5 truncate"># {t.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3.5 text-on-surface-variant hidden sm:table-cell">
                {t.category?.replace("_", " ")}
              </td>
              <td className="px-4 py-3.5 hidden md:table-cell">
                <PriorityDot priority={t.priority} />
              </td>
              <td className="px-4 py-3.5">
                <StatusBadge status={t.status} />
              </td>
              <td className="px-4 py-3.5 text-on-surface-variant hidden lg:table-cell">
                <span className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {t._count?.replies ?? 0}
                </span>
              </td>
              <td className="px-4 py-3.5 text-on-surface-variant whitespace-nowrap hidden lg:table-cell">
                {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
              </td>
              <td className="px-4 py-3.5">
                <ChevronRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Pagination page={page} totalPages={totalPages} total={total} onPage={setPage} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupportPage() {
  const [showModal, setShowModal] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (selectedId) {
    return (
      <div className="h-full">
        <TicketDetail ticketId={selectedId} onBack={() => setSelectedId(null)} />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 gap-5" style={{ height: "calc(100vh - var(--header-height))" }}>
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-on-surface flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" /> Support
          </h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Submit and track your support tickets</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary text-on-primary text-sm font-semibold px-4 py-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" /> New Ticket
        </button>
      </div>

      {/* DataTable — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-auto">
        <TicketTable onSelect={setSelectedId} />
      </div>

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
