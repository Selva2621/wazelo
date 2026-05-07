"use client";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { CountBadge } from "@/components/ui/badge";
import { ChannelIcon } from "@/components/channels/channel-icon";
import type { ChannelType } from "@/lib/types/channels";

export interface Conversation {
  id: string;
  contactName: string;
  contactPhone: string;
  contactAvatar?: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline?: boolean;
  channelType?: ChannelType | null;
}

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationItem({
  conversation,
  isActive,
  onClick,
}: ConversationItemProps) {
  const hasUnread = conversation.unreadCount > 0;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
        isActive
          ? "bg-primary/10"
          : "hover:bg-surface-container",
      )}
    >
      <div className="relative shrink-0">
        <Avatar
          name={conversation.contactName}
          src={conversation.contactAvatar}
          size="md"
        />
        {conversation.isOnline && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-success ring-2 ring-surface-container-lowest" />
        )}
        {!conversation.isOnline && (
          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-container-lowest ring-1 ring-outline-variant/20">
            <ChannelIcon
              type={conversation.channelType ?? "WHATSAPP"}
              className="h-2.5 w-2.5 text-on-surface-variant/60"
            />
          </span>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-[14px] truncate",
              hasUnread
                ? "font-semibold text-on-surface"
                : "font-medium text-on-surface",
            )}
          >
            {conversation.contactName}
          </span>
          <span className="text-[11px] text-on-surface-variant shrink-0">
            {formatTime(conversation.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-[13px] truncate",
              hasUnread
                ? "text-on-surface-variant font-medium"
                : "text-on-surface-variant/70",
            )}
          >
            {conversation.lastMessage}
          </p>
          {hasUnread && <CountBadge count={conversation.unreadCount} />}
        </div>
      </div>
    </button>
  );
}
