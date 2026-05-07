"use client";

import { useEffect, useRef } from "react";
import { MessageBubble, type Message } from "./message-bubble";

interface MessageThreadProps {
  messages: Message[];
}

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

export function MessageThread({ messages }: MessageThreadProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
      {messages.map((msg, i) => {
        const showDate =
          i === 0 || !isSameDay(messages[i - 1].createdAt, msg.createdAt);

        return (
          <div key={msg.id}>
            {showDate && (
              <div className="flex items-center justify-center py-3">
                <span className="text-[11px] font-medium text-on-surface-variant/60 bg-surface-container rounded-full px-3 py-1">
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
  );
}
