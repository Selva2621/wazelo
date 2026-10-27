"use client";

import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LifeBuoy, Plus, X, Loader2, ChevronRight, ArrowLeft, Send,
  ImageIcon, MessageSquare, Tag, AlertCircle, Clock,
  Paperclip, CheckCircle2, Circle, RefreshCw,
} from "lucide-react";
import apiClient from "@/lib/api/client";
import { Spinner } from "@/components/ui/spinner";
import { PAGE_SIZE } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Modal } from "@/components/ui/modal";
import { MobilePageActions } from "@/components/mobile/mobile-page-actions";
import { useHideTabBar } from "@/hooks/use-mobile-chrome";
import { PageHeader } from "@/components/layout/page-header";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = ["GENERAL", "BILLING", "TECHNICAL", "FEATURE_REQUEST"] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

// ─── API ──────────────────────────────────────────────────────────────────────

const ticketApi = {
  list: (params: { page: number; limit: number }) =>
    apiClient.get<any>("/support/tickets", { params }).then((r) => r.data),
  get: (id: string) =>
    apiClient.get<any>(`/support/tickets/${id}`).then((r) => r.data),
  create: (data: { title: string; description: string; category: string; priority: string; attachmentUrl?: string }) =>
    apiClient.post<any>("/support/tickets", data).then((r) => r.data),
  reply: (id: string, body: string) =>
    apiClient.post<any>(`/support/tickets/${id}/replies`, { body }).then((r) => r.data),
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
  OPEN:        { label: "Open",        className: "bg-success/10 text-success border-success/20",  icon: <Circle className="h-3 w-3" /> },
  IN_PROGRESS: { label: "In progress", className: "bg-info/10 text-info border-info/20",           icon: <RefreshCw className="h-3 w-3" /> },
  RESOLVED:    { label: "Resolved",    className: "bg-chart-5/10 text-chart-5 border-chart-5/20",     icon: <CheckCircle2 className="h-3 w-3" /> },
  CLOSED:      { label: "Closed",      className: "bg-surface-container text-on-surface-variant border-outline-variant", icon: <X className="h-3 w-3" /> },
};

const PRIORITY_CONFIG: Record<string, { className: string; dot: string }> = {
  LOW:    { className: "text-on-surface-variant", dot: "bg-on-surface-variant/40" },
  MEDIUM: { className: "text-info",           dot: "bg-info" },
  HIGH:   { className: "text-warning",         dot: "bg-warning" },
  URGENT: { className: "text-error",            dot: "bg-error" },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.CLOSED;
  return (
    <span className={`inline-flex items-center gap-1 text-label px-2 py-0.5 rounded-full font-medium border ${cfg.className}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const cfg = PRIORITY_CONFIG[priority] ?? PRIORITY_CONFIG.MEDIUM;
  return (
    <span className={`inline-flex items-center gap-1.5 text-label font-medium ${cfg.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      {priority}
    </span>
  );
}

function AuthImage({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return (
    <div className="flex items-center gap-1.5 text-label text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg px-3 py-2 w-fit">
      <ImageIcon className="h-3.5 w-3.5" /> Failed to load image
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="attachment" className={className} onError={() => setFailed(true)} />
    </a>
  );
}

// ─── New Ticket Modal ─────────────────────────────────────────────────────────

function NewTicketModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} aria-labelledby="new-ticket-title" className="max-w-lg">
      {/* Form state lives in a child so it resets each time the modal opens. */}
      {() => <NewTicketForm onClose={onClose} />}
    </Modal>
  );
}

function NewTicketForm({ onClose }: { onClose: () => void }) {
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
      <>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-4 w-4 text-primary" />
            <h2 id="new-ticket-title" className="font-semibold text-on-surface text-body-lg">New support ticket</h2>
          </div>
          <IconButton size="xs" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </IconButton>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-label font-medium text-on-surface-variant">Title</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
              maxLength={255}
              placeholder="Briefly describe the issue"
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-body-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
            />
          </div>

          {/* Category + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as any })}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              >
                {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-label font-medium text-on-surface-variant">Priority</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-body-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
              >
                {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-label font-medium text-on-surface-variant">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              required
              rows={4}
              placeholder="Explain the issue in detail..."
              className="w-full bg-surface-container border border-outline-variant rounded-xl px-3 py-2.5 text-body-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-none transition-colors"
            />
          </div>

          {/* Image upload */}
          <div className="space-y-1.5">
            <label className="text-label font-medium text-on-surface-variant">
              Attachment <span className="normal-case font-normal text-on-surface-variant/50">(optional · max 16 MB)</span>
            </label>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageSelect} className="hidden" />
            {imagePreview ? (
              <div className="relative w-fit group">
                <img src={imagePreview} alt="preview" className="max-h-28 rounded-xl border border-outline-variant object-contain bg-surface-container" />
                <IconButton size="xs" variant="danger"
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-2 -right-2 bg-surface-container-high border border-outline-variant shadow-sm" aria-label="Remove">
                  <X className="h-3 w-3" />
                </IconButton>
              </div>
            ) : (
              <Button variant="secondary" size="lg"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-dashed hover:border-primary/50"
              >
                <Paperclip className="h-4 w-4" />
                Click to attach an image
              </Button>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-2 text-body-lg text-error bg-error/10 border border-error/20 rounded-xl px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="secondary" size="lg"
              type="button"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button size="lg"
              type="submit"
              disabled={create.isPending || uploading}
              className="flex-1"
            >
              {(uploading || create.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
              {uploading ? "Uploading…" : create.isPending ? "Submitting…" : "Submit ticket"}
            </Button>
          </div>
        </form>
      </>
  );
}

// ─── Ticket Detail ────────────────────────────────────────────────────────────

function TicketDetail({ ticketId, onBack }: { ticketId: string; onBack: () => void }) {
  const { data: ticket, isLoading } = useTicket(ticketId);
  const reply = useReply(ticketId);
  const [body, setBody] = useState("");
  // Mobile: full-screen ticket thread
  useHideTabBar(true);

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
          className="flex items-center gap-1.5 rounded text-body-lg text-on-surface-variant outline-none hover:text-on-surface transition-colors focus-visible:ring-2 focus-visible:ring-focus group"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>
        <span className="text-outline-variant">|</span>
        <StatusBadge status={ticket.status} />
        <span className="text-label text-on-surface-variant ml-auto">
          #{ticket.id.slice(0, 8).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main: conversation */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Ticket header */}
          <div className="px-6 py-5 border-b border-outline-variant flex-shrink-0">
            <h1 className="text-title-sm font-semibold text-on-surface leading-snug">{ticket.title}</h1>
            <div className="flex items-center flex-wrap gap-3 mt-2">
              <PriorityDot priority={ticket.priority} />
              <span className="flex items-center gap-1 text-label text-on-surface-variant">
                <Tag className="h-3 w-3" /> {ticket.category.replace("_", " ")}
              </span>
              <span className="flex items-center gap-1 text-label text-on-surface-variant">
                <Clock className="h-3 w-3" /> {new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </span>
              {ticket._count?.replies !== undefined && (
                <span className="flex items-center gap-1 text-label text-on-surface-variant">
                  <MessageSquare className="h-3 w-3" /> {ticket._count.replies} replies
                </span>
              )}
            </div>
          </div>

          {/* Scrollable messages area */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Original message */}
            <div className="flex justify-start">
              <div className="max-w-[75%] max-lg:max-w-[88%]">
                <div className="text-label text-on-surface-variant mb-1.5 flex items-center gap-1.5">
                  <span className="font-medium text-on-surface">You</span>
                  <span>·</span>
                  <span>{new Date(ticket.createdAt).toLocaleString()}</span>
                </div>
                <div className="bg-surface-container border border-outline-variant rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-body-lg text-on-surface whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
                  {ticket.attachmentUrl && (
                    <div className="mt-3 pt-3 border-t border-outline-variant/50">
                      <p className="text-label text-on-surface-variant flex items-center gap-1 mb-2">
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
                  <div className={`max-w-[75%] max-lg:max-w-[88%]`}>
                    <div className={`text-label text-on-surface-variant mb-1.5 flex items-center gap-1.5 ${isSupport ? "justify-end" : ""}`}>
                      <span className="font-medium text-on-surface">{isSupport ? "Support team" : "You"}</span>
                      <span>·</span>
                      <span>{new Date(r.createdAt).toLocaleString()}</span>
                    </div>
                    <div className={`border rounded-2xl px-4 py-3 ${
                      isSupport
                        ? "bg-primary/10 border-primary/20 rounded-tr-sm"
                        : "bg-surface-container border-outline-variant rounded-tl-sm"
                    }`}>
                      <p className="text-body-lg text-on-surface whitespace-pre-wrap leading-relaxed">{r.body}</p>
                    </div>
                  </div>
                </div>
              );
            })}

            {isClosed && (
              <div className="flex items-center gap-3 py-2">
                <div className="flex-1 h-px bg-outline-variant" />
                <span className="text-label text-on-surface-variant">Ticket {ticket.status.toLowerCase()}</span>
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
                  className="w-full bg-transparent px-4 pt-3 pb-1 text-body-lg text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none resize-none"
                />
                <div className="flex items-center justify-end px-3 py-2">
                  <Button
                    onClick={handleReply}
                    disabled={!body.trim() || reply.isPending}
                   
                  >
                    {reply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send reply
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar: ticket meta */}
        <div className="w-64 border-l border-outline-variant flex-shrink-0 px-5 py-5 space-y-5 overflow-y-auto hidden lg:block">
          <div>
            <p className="text-label font-medium text-on-surface-variant mb-2">Status</p>
            <StatusBadge status={ticket.status} />
          </div>
          <div>
            <p className="text-label font-medium text-on-surface-variant mb-2">Priority</p>
            <PriorityDot priority={ticket.priority} />
          </div>
          <div>
            <p className="text-label font-medium text-on-surface-variant mb-2">Category</p>
            <p className="text-body-lg text-on-surface">{ticket.category.replace("_", " ")}</p>
          </div>
          <div>
            <p className="text-label font-medium text-on-surface-variant mb-2">Opened</p>
            <p className="text-body-lg text-on-surface">{new Date(ticket.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          {ticket.closedAt && (
            <div>
              <p className="text-label font-medium text-on-surface-variant mb-2">Closed</p>
              <p className="text-body-lg text-on-surface">{new Date(ticket.closedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Ticket List (DataTable) ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tickets come from an untyped local API
type Ticket = any;

const ticketColumns: DataTableColumn<Ticket>[] = [
  {
    id: "ticket",
    header: "Ticket",
    className: "max-w-[220px]",
    cell: (t) => (
      <div className="flex items-start gap-2">
        {t.attachmentUrl && <Paperclip className="h-3.5 w-3.5 text-on-surface-variant flex-shrink-0 mt-0.5" />}
        <div className="min-w-0">
          <p className="font-medium text-on-surface truncate group-hover:text-primary transition-colors">{t.title}</p>
          <p className="text-label text-on-surface-variant mt-0.5 truncate"># {t.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>
    ),
  },
  {
    id: "category",
    header: "Category",
    cellClassName: "text-on-surface-variant",
    cell: (t) => t.category?.replace("_", " "),
  },
  {
    id: "priority",
    header: "Priority",
    skeleton: "short",
    cell: (t) => <PriorityDot priority={t.priority} />,
  },
  {
    id: "status",
    header: "Status",
    skeleton: "badge",
    cell: (t) => <StatusBadge status={t.status} />,
  },
  {
    id: "replies",
    header: "Replies",
    skeleton: "short",
    cellClassName: "text-on-surface-variant",
    cell: (t) => (
      <span className="flex items-center gap-1.5">
        <MessageSquare className="h-3.5 w-3.5" />
        {t._count?.replies ?? 0}
      </span>
    ),
  },
  {
    id: "date",
    header: "Date",
    skeleton: "short",
    cellClassName: "text-on-surface-variant whitespace-nowrap",
    cell: (t) => new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
  },
  {
    id: "open",
    header: "Open",
    hideHeader: true,
    className: "w-8",
    skeleton: "none",
    cell: () => <ChevronRight className="h-4 w-4 text-on-surface-variant group-hover:text-primary transition-colors" />,
  },
];

function TicketTable({ onSelect }: { onSelect: (id: string) => void }) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useTickets(page);

  const tickets: Ticket[] = data?.tickets ?? [];
  const total: number = data?.total ?? 0;

  return (
    <div className="border border-outline-variant rounded-2xl overflow-hidden bg-surface-container-lowest">
      <DataTable
        label="Support tickets"
        columns={ticketColumns}
        rows={tickets}
        rowKey={(t) => t.id}
        rowLabel={(t) => t.title}
        loading={isLoading}
        skeletonRows={6}
        onRowClick={(t) => onSelect(t.id)}
        rowClassName={() => "group"}
        pagination={{ page: page - 1, pageSize: PAGE_SIZE, total, onPageChange: (p) => setPage(p + 1) }}
        empty={{
          icon: <LifeBuoy className="h-12 w-12" />,
          title: "No tickets yet",
          description: "Create a ticket and we'll get back to you.",
        }}
      />
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
      <MobilePageActions primary={{ label: "New ticket", onClick: () => setShowModal(true) }} />
      <PageHeader
        className="flex-shrink-0 max-lg:hidden"
        title="Support"
        actions={
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> New ticket
          </Button>
        }
      />

      {/* DataTable — fills remaining height */}
      <div className="flex-1 min-h-0 overflow-auto">
        <TicketTable onSelect={setSelectedId} />
      </div>

      <NewTicketModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
