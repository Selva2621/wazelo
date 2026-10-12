"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MessageBubble, type Message } from "./message-bubble";

interface MessageThreadProps {
  messages: Message[];
}

/** Distance from the bottom (px) still treated as "at the latest message". */
const NEAR_BOTTOM_PX = 120;

function formatDateDivider(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return date.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function isSameDay(a: string, b: string): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
}

/** Remount per conversation (`key={conversationId}`) so it opens at the latest message. */
export function MessageThread({ messages }: MessageThreadProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(messages.length);
  // Measured on scroll, before new content lands, so a fresh message doesn't count as "scrolled away"
  const wasNearBottomRef = useRef(true);
  const [isAwayFromBottom, setIsAwayFromBottom] = useState(false);
  // Message count the agent has seen (last time they were at the bottom)
  const [seenCount, setSeenCount] = useState(messages.length);
  const unseenCount = isAwayFromBottom ? Math.max(0, messages.length - seenCount) : 0;

  const scrollToBottom = (behavior: ScrollBehavior) => {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // Open on the latest message instantly
  useLayoutEffect(() => {
    scrollToBottom("auto");
  }, []);

  // New messages: follow along if the agent was at the bottom or just sent one;
  // otherwise leave their scroll position alone (the pill shows what they missed)
  useEffect(() => {
    const added = messages.length - prevCountRef.current;
    prevCountRef.current = messages.length;
    if (added <= 0) return;

    const last = messages[messages.length - 1];
    if (last?.direction === "outgoing" || wasNearBottomRef.current) {
      scrollToBottom("smooth");
    }
  }, [messages]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    wasNearBottomRef.current = near;
    setIsAwayFromBottom(!near);
    if (near) setSeenCount(messages.length);
  };

  return (
    <div className="relative flex-1 min-h-0">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto overscroll-contain px-3 py-4 sm:px-4 space-y-3"
      >
        {messages.map((msg, i) => {
          const showDate =
            i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="sticky top-0 z-10 flex items-center justify-center py-3">
                  <span className="text-caption font-medium text-on-surface-variant bg-surface-container/90 backdrop-blur-sm rounded-full px-3 py-1">
                    {formatDateDivider(msg.createdAt)}
                  </span>
                </div>
              )}
              <MessageBubble message={msg} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Jump to latest */}
      <button
        type="button"
        onClick={() => scrollToBottom("smooth")}
        aria-label={unseenCount > 0 ? `${unseenCount} new messages, jump to latest` : "Jump to latest message"}
        className={cn(
          "absolute bottom-4 right-4 z-20 flex items-center gap-1.5 rounded-full border border-outline-variant/30 bg-surface-container-lowest shadow-popover transition-[opacity,transform] duration-200 ease-standard",
          unseenCount > 0 ? "px-3 py-2" : "p-2.5",
          isAwayFromBottom
            ? "opacity-100 translate-y-0"
            : "pointer-events-none opacity-0 translate-y-2",
        )}
      >
        {unseenCount > 0 && (
          <span className="text-label font-semibold text-primary tabular-nums">
            {unseenCount > 99 ? "99+" : unseenCount} new
          </span>
        )}
        <ArrowDown className="h-4 w-4 text-on-surface-variant" />
      </button>
    </div>
  );
}

const SKELETON_ROWS = [
  { out: false, w: "w-2/5" },
  { out: false, w: "w-3/5" },
  { out: true, w: "w-1/2" },
  { out: false, w: "w-1/3" },
  { out: true, w: "w-2/3" },
  { out: true, w: "w-1/4" },
];

/** Placeholder bubbles shown while a conversation's messages load. */
export function MessageThreadSkeleton() {
  return (
    <div className="flex-1 min-h-0 overflow-hidden px-3 py-4 sm:px-4 space-y-3" aria-busy="true" aria-label="Loading messages">
      {SKELETON_ROWS.map((row, i) => (
        <div key={i} className={cn("flex", row.out ? "justify-end" : "justify-start")}>
          <div
            className={cn(
              "h-11 rounded-2xl animate-pulse",
              row.w,
              row.out ? "bg-bubble-out/30" : "bg-surface-container",
            )}
          />
        </div>
      ))}
    </div>
  );
}
