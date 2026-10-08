"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Send, Loader2, ImageIcon, Lock } from "lucide-react";
import {
  useSATicket,
  useSAReplyToTicket,
  useSAUpdateTicketStatus,
  useSATicketAssignees,
  useSAAssignTicket,
} from "@/hooks/use-super-admin";
import { useSuperAdminAuthStore } from "@/stores/super-admin-auth-store";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";

function errorMessage(err: any, fallback: string): string {
  const message = err?.response?.data?.message;
  if (Array.isArray(message)) return message[0];
  return message ?? fallback;
}

function AuthImage({ url, title, className }: { url: string; title: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return (
    <div className="flex items-center gap-1.5 text-label text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg px-3 py-2 w-fit">
      <ImageIcon className="h-3.5 w-3.5" aria-hidden /> Failed to load image
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt={`Attachment for "${title}"`} className={className} onError={() => setFailed(true)} />
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function SATicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useSATicket(id);
  const replyMutation = useSAReplyToTicket(id);
  const statusMutation = useSAUpdateTicketStatus(id);
  const assignMutation = useSAAssignTicket(id);
  const { data: assignees } = useSATicketAssignees();
  const me = useSuperAdminAuthStore((s) => s.superAdmin);
  const [replyBody, setReplyBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [status, setStatus] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const handleReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;
    setStatus(null);
    replyMutation.mutate(
      { body: replyBody, internal },
      {
        onSuccess: () => {
          setReplyBody("");
          setStatus({
            kind: "success",
            text: internal ? "Internal note added. The customer can't see it." : "Reply sent. The customer has been notified.",
          });
          setInternal(false);
        },
        onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not send the reply") }),
      },
    );
  };

  const handleAssign = (assigneeId: string | null) => {
    setStatus(null);
    assignMutation.mutate(assigneeId, {
      onSuccess: (res: any) =>
        setStatus({ kind: "success", text: res?.assignedTo ? `Assigned to ${res.assignedTo.name}.` : "Ticket unassigned." }),
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not assign the ticket") }),
    });
  };

  const handleStatusChange = (next: string) => {
    setStatus(null);
    statusMutation.mutate(next, {
      onSuccess: () => setStatus({ kind: "success", text: `Status changed to ${next.replace("_", " ")}.` }),
      onError: (err) => setStatus({ kind: "error", text: errorMessage(err, "Could not change the status") }),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64" role="status">
        <Spinner className="text-primary" />
        <span className="sr-only">Loading ticket…</span>
      </div>
    );
  }
  if (!ticket) return <div className="p-6 text-on-surface-variant">Ticket not found</div>;

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-start gap-3">
        <Link
          href="/super-admin/tickets"
          aria-label="Back to tickets"
          className="text-on-surface-variant hover:text-on-surface mt-0.5 rounded-lg p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden />
        </Link>
        <div className="flex-1">
          <h1 className="text-title font-semibold text-on-surface">{ticket.title}</h1>
          <div className="flex flex-wrap gap-2 mt-1 text-label text-on-surface-variant">
            <span>{ticket.organization?.name}</span>
            <span aria-hidden>·</span>
            <span>{ticket.user?.firstName} {ticket.user?.lastName}</span>
            <span aria-hidden>·</span>
            <span>{ticket.category}</span>
            <span aria-hidden>·</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        <div>
          <label htmlFor="ticket-status" className="sr-only">Ticket status</label>
          <select
            id="ticket-status"
            value={ticket.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusMutation.isPending}
            className="bg-surface-container border border-outline-variant text-on-surface text-body-lg rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
        </div>
      </div>

      {/* Assignment */}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="ticket-assignee" className="text-body-lg text-on-surface-variant">Assignee</label>
        <select
          id="ticket-assignee"
          value={ticket.assignedToId ?? ""}
          onChange={(e) => handleAssign(e.target.value || null)}
          disabled={assignMutation.isPending}
          className="bg-surface-container border border-outline-variant text-on-surface text-body-lg rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">Unassigned</option>
          {(assignees ?? []).map((a) => (
            <option key={a.id} value={a.id}>{a.name}{a.id === me?.id ? " (me)" : ""}</option>
          ))}
        </select>
        {me && ticket.assignedToId !== me.id && (
          <Button type="button" variant="ghost" size="sm" onClick={() => handleAssign(me.id)} disabled={assignMutation.isPending}>
            Assign to me
          </Button>
        )}
      </div>

      {status && <Alert variant={status.kind}>{status.text}</Alert>}

      {/* Description */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <p className="text-body-lg text-on-surface whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Attachment */}
      {ticket.attachmentUrl && (
        <div className="space-y-1.5">
          <p className="text-label text-on-surface-variant flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden /> Attachment
          </p>
          <AuthImage
            url={ticket.attachmentUrl}
            title={ticket.title}
            className="max-h-64 rounded-xl border border-outline-variant object-contain bg-surface-container hover:opacity-90 transition-opacity cursor-pointer"
          />
        </div>
      )}

      {/* Replies */}
      {ticket.replies?.length > 0 && (
        <section aria-labelledby="replies-heading">
          <h2 id="replies-heading" className="sr-only">Conversation</h2>
          <ol className="space-y-3">
            {ticket.replies.map((reply: any) => {
              const isAdmin = !!reply.superAdmin;
              const author = isAdmin
                ? `Support (${reply.superAdmin.name})`
                : `${reply.user?.firstName ?? ""} ${reply.user?.lastName ?? ""}`.trim();
              return (
                <li key={reply.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                  <article
                    aria-label={`${reply.isInternal ? "Internal note" : "Reply"} from ${author}`}
                    className={`max-w-[80%] rounded-xl px-4 py-3 text-body-lg border ${
                      reply.isInternal
                        ? "bg-warning/10 border-warning/40 border-dashed"
                        : isAdmin
                          ? "bg-primary/10 border-primary/20"
                          : "bg-surface-container-low border-outline-variant"
                    }`}
                  >
                    <div className="text-label text-on-surface-variant mb-1">
                      {reply.isInternal && (
                        <span className="mr-1.5 inline-flex items-center gap-1 rounded-full bg-warning/15 px-1.5 py-0.5 font-medium text-warning">
                          <Lock className="h-3 w-3" aria-hidden /> Internal note
                        </span>
                      )}
                      {author}
                      {" · "}
                      <time dateTime={reply.createdAt}>{new Date(reply.createdAt).toLocaleString()}</time>
                    </div>
                    <p className="text-on-surface whitespace-pre-wrap">{reply.body}</p>
                  </article>
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {/* Reply box */}
      {ticket.status !== "CLOSED" && (
        <form onSubmit={handleReply} className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3">
          <label htmlFor="ticket-reply" className="block text-body-lg font-medium text-on-surface-variant">
            Reply to customer
          </label>
          <textarea
            id="ticket-reply"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full bg-surface-container border border-outline-variant text-on-surface text-body-lg rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-placeholder"
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-body-lg text-on-surface-variant cursor-pointer">
              <input
                type="checkbox"
                checked={internal}
                onChange={(e) => setInternal(e.target.checked)}
                className="h-4 w-4 rounded border-outline accent-primary"
              />
              <Lock className="h-3.5 w-3.5" aria-hidden />
              Internal note — only staff can see this
            </label>
            <Button type="submit" disabled={!replyBody.trim() || replyMutation.isPending}>
              {replyMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                : internal ? <Lock className="h-4 w-4" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
              {internal ? "Add internal note" : "Send Reply"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
