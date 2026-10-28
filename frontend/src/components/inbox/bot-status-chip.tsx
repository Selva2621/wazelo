"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Play } from "lucide-react";
import { toast } from "sonner";
import { chatbotApi, type ChatBotState } from "@/lib/api/chatbot";
import { IconButton } from "@/components/ui/icon-button";

function untilLabel(iso: string): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return d.toLocaleString(
    undefined,
    sameDay ? { hour: "numeric", minute: "2-digit" } : { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" },
  );
}

/**
 * Chat header: are the chatbot and automations answering in this chat?
 * Paused (a person replied, assigned it, or replied on the phone) → "Auto-replies paused · Resume".
 * Answering → a small button to pause them before replying.
 */
export function BotStatusChip({
  conversationId,
  lastActivity,
}: {
  conversationId: string;
  /** Last message time in the chat: a reply from the team pauses auto-replies server-side */
  lastActivity?: string;
}) {
  const qc = useQueryClient();
  const key = ["chat-bot", conversationId];
  const { data, refetch } = useQuery({
    queryKey: key,
    queryFn: () => chatbotApi.getChatBot(conversationId),
    refetchInterval: 60_000,
  });

  // New message in the chat → re-check shortly after (the pause is written just after a send)
  useEffect(() => {
    if (!lastActivity) return;
    const t = setTimeout(() => void refetch(), 1500);
    return () => clearTimeout(t);
  }, [lastActivity, refetch]);

  const set = (next: ChatBotState) => qc.setQueryData(key, next);
  const resume = useMutation({
    mutationFn: () => chatbotApi.resumeChatBot(conversationId),
    onSuccess: (next) => {
      set(next);
      toast.success("Auto-replies are back on in this chat");
    },
    onError: () => toast.error("Couldn't resume auto-replies. Try again."),
  });
  const pause = useMutation({
    mutationFn: () => chatbotApi.pauseChatBot(conversationId),
    onSuccess: (next) => {
      set(next);
      toast.success("Auto-replies paused in this chat");
    },
    onError: () => toast.error("Couldn't pause auto-replies. Try again."),
  });

  if (!data) return null;

  if (!data.pausedUntil) {
    return (
      <IconButton
        size="sm"
        onClick={() => pause.mutate()}
        disabled={pause.isPending}
        className="hover:text-primary hover:bg-primary/10"
        title="Pause the chatbot and automations in this chat"
        aria-label="Pause auto-replies in this chat"
      >
        <Bot className="h-4 w-4" />
      </IconButton>
    );
  }

  return (
    <div
      role="status"
      className="flex h-8 items-center gap-1 rounded-full border border-outline-variant bg-surface-container-low pl-2.5 pr-1 text-caption text-on-surface-variant"
      title={`The chatbot and automations stay quiet here until ${untilLabel(data.pausedUntil)}`}
    >
      <Bot className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="hidden whitespace-nowrap md:inline">Auto-replies paused</span>
      <button
        type="button"
        onClick={() => resume.mutate()}
        disabled={resume.isPending}
        className="ml-1 flex h-6 items-center gap-1 rounded-full bg-surface-container-lowest px-2 font-medium text-primary outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-60"
        aria-label="Resume auto-replies in this chat"
      >
        <Play className="h-3 w-3" aria-hidden /> Resume
      </button>
    </div>
  );
}
