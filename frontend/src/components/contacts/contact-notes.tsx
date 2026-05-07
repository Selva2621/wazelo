"use client";

import { useState } from "react";
import { Send, ShoppingBag, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useContactNotes, useAddNote } from "@/hooks/use-contacts";
import { Spinner } from "@/components/ui/spinner";

interface ContactNotesProps {
  contactId: string;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ContactNotes({ contactId }: ContactNotesProps) {
  const [content, setContent] = useState("");
  const { data, isLoading } = useContactNotes(contactId);
  const addNote = useAddNote();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    addNote.mutate(
      { contactId, content: content.trim() },
      { onSuccess: () => setContent("") },
    );
  }

  return (
    <div className="space-y-3">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Add a note..."
          rows={2}
          className="flex-1 rounded-xl bg-surface-container-low px-3 py-2 text-[13px] text-on-surface placeholder:text-on-surface-variant/50 outline-none focus:ring-1 focus:ring-primary/40 resize-none"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!content.trim() || addNote.isPending}
          loading={addNote.isPending}
          className="self-end"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </form>

      {/* Notes list */}
      {isLoading && (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      )}

      {data?.notes.map((note) => {
        const isShopifyOrder = note.content.startsWith("Shopify order");
        const isShopifyCart = note.content.startsWith("Shopify abandoned cart");
        const isShopify = isShopifyOrder || isShopifyCart;

        return (
          <div
            key={note.id}
            className={`rounded-xl p-3 space-y-1 ${isShopify ? "bg-[#96bf48]/10 border border-[#96bf48]/20" : "bg-surface-container"}`}
          >
            {isShopify && (
              <div className="flex items-center gap-1.5 mb-1">
                {isShopifyCart ? (
                  <ShoppingCart className="h-3 w-3 text-[#96bf48]" />
                ) : (
                  <ShoppingBag className="h-3 w-3 text-[#96bf48]" />
                )}
                <span className="text-[10px] font-semibold text-[#96bf48] uppercase tracking-wide">
                  {isShopifyCart ? "Abandoned Cart" : "Shopify Order"}
                </span>
              </div>
            )}
            <p className="text-[13px] text-on-surface leading-relaxed whitespace-pre-wrap">
              {note.content}
            </p>
            <p className="text-[11px] text-on-surface-variant/60">
              {timeAgo(note.createdAt)}
            </p>
          </div>
        );
      })}

      {data && data.notes.length === 0 && (
        <p className="text-center text-[13px] text-on-surface-variant/50 py-4">
          No notes yet
        </p>
      )}
    </div>
  );
}
