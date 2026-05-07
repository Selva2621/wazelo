"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Send, Loader2, ImageIcon } from "lucide-react";
import { useSATicket, useSAReplyToTicket, useSAUpdateTicketStatus } from "@/hooks/use-super-admin";
import { Spinner } from "@/components/ui/spinner";

function AuthImage({ url, className }: { url: string; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) return (
    <div className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container border border-outline-variant rounded-lg px-3 py-2 w-fit">
      <ImageIcon className="h-3.5 w-3.5" /> Failed to load image
    </div>
  );
  return (
    <a href={url} target="_blank" rel="noreferrer">
      <img src={url} alt="ticket attachment" className={className} onError={() => setFailed(true)} />
    </a>
  );
}

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

export default function SATicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: ticket, isLoading } = useSATicket(id);
  const replyMutation = useSAReplyToTicket(id);
  const statusMutation = useSAUpdateTicketStatus(id);
  const [replyBody, setReplyBody] = useState("");

  const handleReply = () => {
    if (!replyBody.trim()) return;
    replyMutation.mutate(replyBody, {
      onSuccess: () => setReplyBody(""),
    });
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner className="text-primary" /></div>;
  if (!ticket) return <div className="p-6 text-on-surface-variant">Ticket not found</div>;

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-start gap-3">
        <Link href="/super-admin/tickets" className="text-on-surface-variant hover:text-on-surface mt-0.5">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-on-surface">{ticket.title}</h1>
          <div className="flex flex-wrap gap-2 mt-1 text-xs text-on-surface-variant">
            <span>{ticket.organization?.name}</span>
            <span>·</span>
            <span>{ticket.user?.firstName} {ticket.user?.lastName}</span>
            <span>·</span>
            <span>{ticket.category}</span>
            <span>·</span>
            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
        {/* Status selector */}
        <select
          value={ticket.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
          disabled={statusMutation.isPending}
          className="bg-surface-container border border-outline-variant text-on-surface text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
        </select>
      </div>

      {/* Description */}
      <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4">
        <p className="text-sm text-on-surface whitespace-pre-wrap">{ticket.description}</p>
      </div>

      {/* Attachment */}
      {ticket.attachmentUrl && (
        <div className="space-y-1.5">
          <p className="text-xs text-on-surface-variant flex items-center gap-1">
            <ImageIcon className="h-3.5 w-3.5" /> Attachment
          </p>
          <AuthImage
            url={ticket.attachmentUrl}
            className="max-h-64 rounded-xl border border-outline-variant object-contain bg-surface-container hover:opacity-90 transition-opacity cursor-pointer"
          />
        </div>
      )}

      {/* Replies */}
      <div className="space-y-3">
        {ticket.replies?.map((reply: any) => {
          const isAdmin = !!reply.superAdmin;
          return (
            <div key={reply.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-xl px-4 py-3 text-sm border ${
                isAdmin ? "bg-primary/10 border-primary/20" : "bg-surface-container-low border-outline-variant"
              }`}>
                <div className="text-xs text-on-surface-variant mb-1">
                  {isAdmin ? `Support (${reply.superAdmin.name})` : `${reply.user?.firstName} ${reply.user?.lastName}`}
                  {" · "}{new Date(reply.createdAt).toLocaleString()}
                </div>
                <p className="text-on-surface whitespace-pre-wrap">{reply.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply box */}
      {ticket.status !== "CLOSED" && (
        <div className="bg-surface-container-low border border-outline-variant rounded-xl p-4 space-y-3">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            placeholder="Write a reply..."
            rows={3}
            className="w-full bg-surface-container border border-outline-variant text-on-surface text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary resize-none placeholder:text-on-surface-variant/50"
          />
          <div className="flex justify-end">
            <button
              onClick={handleReply}
              disabled={!replyBody.trim() || replyMutation.isPending}
              className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-on-primary text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {replyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send Reply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
