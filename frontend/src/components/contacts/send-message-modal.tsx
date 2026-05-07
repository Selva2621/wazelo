"use client";

import { useState } from "react";
import { X, Send, MessageSquare } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { messagesApi } from "@/lib/api/messages";
import { Button } from "@/components/ui/button";

interface SendMessageModalProps {
  open: boolean;
  onClose: () => void;
  contactName: string;
  phoneNumber: string;
}

export function SendMessageModal({
  open,
  onClose,
  contactName,
  phoneNumber,
}: SendMessageModalProps) {
  const [message, setMessage] = useState("");
  const queryClient = useQueryClient();

  const sendMessage = useMutation({
    mutationFn: () =>
      messagesApi.send({
        contactPhone: phoneNumber,
        contactName,
        type: "TEXT",
        body: message.trim(),
        idempotencyKey: `contact-send-${phoneNumber}-${Date.now()}`,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
      setMessage("");
      onClose();
    },
  });

  if (!open) return null;

  const MAX_LENGTH = 4096;

  function handleSend() {
    if (!message.trim() || sendMessage.isPending) return;
    if (message.length > MAX_LENGTH) return;
    sendMessage.mutate();
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-surface-container-lowest border border-outline-variant/15 shadow-2xl p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h2 className="text-[15px] font-semibold text-on-surface">
              Send Message
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Contact info */}
        <div className="px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/10 text-[13px]">
          <span className="text-on-surface-variant/60">To: </span>
          <span className="text-on-surface font-medium">{contactName}</span>
          <span className="text-on-surface-variant/60 ml-2">{phoneNumber}</span>
        </div>

        {/* Message input */}
        <div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSend();
            }}
            placeholder="Type your message..."
            rows={4}
            autoFocus
            className="w-full rounded-xl bg-surface-container-low px-3 py-2.5 text-[13px] text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:ring-1 focus:ring-primary/40 border border-outline-variant/15 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <p className="text-[11px] text-on-surface-variant/40">Ctrl+Enter to send</p>
            <p className={`text-[11px] tabular-nums ${message.length > MAX_LENGTH ? "text-error" : "text-on-surface-variant/40"}`}>
              {message.length} / {MAX_LENGTH.toLocaleString()}
            </p>
          </div>
          {message.length > MAX_LENGTH && (
            <p className="text-[11px] text-error mt-1">Message is too long.</p>
          )}
        </div>

        {/* Error */}
        {sendMessage.isError && (
          <p className="text-[12px] text-error">
            Failed to send message. Make sure WhatsApp is connected.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!message.trim() || message.length > MAX_LENGTH}
            loading={sendMessage.isPending}
          >
            <Send className="h-3.5 w-3.5 mr-1.5" />
            Send
          </Button>
        </div>
      </div>
    </>
  );
}
