"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import { MessageSquareText, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCannedResponses } from "@/hooks/use-canned-responses";
import { cannedResponsesApi } from "@/lib/api/canned-responses";
import type { CannedResponse } from "@/lib/types/canned-responses";
import { rankByWords } from "@/lib/text-match";

const MAX_SHOWN = 8;

/** Shortcut matches first (exact, then starts-with), then by words in the name and text */
function matchReplies(replies: CannedResponse[], filter: string): CannedResponse[] {
  const q = filter.trim().toLowerCase();
  if (!q) return replies.slice(0, MAX_SHOWN); // already ordered by most used
  const byShortcut = replies
    .filter((r) => r.shortcut?.toLowerCase().startsWith(q))
    .sort((a, b) => Number(b.shortcut?.toLowerCase() === q) - Number(a.shortcut?.toLowerCase() === q));
  const rest = rankByWords(
    replies.filter((r) => !byShortcut.includes(r)),
    q,
    (r) => [
      { text: r.title, weight: 3 },
      { text: r.content, weight: 1 },
    ],
    MAX_SHOWN,
  );
  return [...byShortcut, ...rest].slice(0, MAX_SHOWN);
}

/**
 * State for the "/" quick-reply picker. The message box owns the keyboard:
 * it passes keys to `handleKey` first, so Enter picks a reply instead of sending
 * "/shortcut", and the arrows move the highlight instead of the caret.
 */
export function useQuickReplyPicker(open: boolean, filter: string, listboxId: string) {
  const { data: replies = [], isLoading } = useCannedResponses();
  const items = useMemo(() => matchReplies(replies, filter), [replies, filter]);
  const [active, setActive] = useState({ filter, index: 0 });
  // A new filter starts the highlight from the top
  const activeIndex = active.filter === filter ? Math.min(active.index, Math.max(items.length - 1, 0)) : 0;
  const setActiveIndex = (index: number) => setActive({ filter, index });

  /** Returns true when the picker used the key */
  function handleKey(e: KeyboardEvent, onPick: (r: CannedResponse) => void, onClose: () => void): boolean {
    if (!open) return false;
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return true;
    }
    if (items.length === 0) return false;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((activeIndex + 1) % items.length);
      return true;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((activeIndex - 1 + items.length) % items.length);
      return true;
    }
    if ((e.key === "Enter" && !e.shiftKey) || e.key === "Tab") {
      e.preventDefault();
      onPick(items[activeIndex]);
      return true;
    }
    return false;
  }

  return {
    items,
    total: replies.length,
    isLoading,
    activeIndex,
    setActiveIndex,
    handleKey,
    activeId: open && items[activeIndex] ? `${listboxId}-${items[activeIndex].id}` : undefined,
  };
}

/** Counts a use so the most used replies come first next time */
export function recordQuickReplyUse(r: CannedResponse) {
  cannedResponsesApi.recordUsage(r.id).catch(() => {});
}

interface QuickReplyListProps {
  listboxId: string;
  filter: string;
  picker: ReturnType<typeof useQuickReplyPicker>;
  onPick: (r: CannedResponse) => void;
  onManage: () => void;
}

/** The "/" pop-up above the message box */
export function QuickReplyList({ listboxId, filter, picker, onPick, onManage }: QuickReplyListProps) {
  const { items, total, isLoading, activeIndex, setActiveIndex } = picker;

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-1 overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-lg">
      <div className="flex items-center justify-between border-b border-outline-variant/20 px-3 py-1.5">
        <p className="text-caption font-medium text-on-surface-variant">
          Quick replies <span className="font-normal">· ↑↓ to move, Enter to use, Esc to close</span>
        </p>
        <button
          type="button"
          // Keep focus in the message box while clicking
          onMouseDown={(e) => e.preventDefault()}
          onClick={onManage}
          className="flex items-center gap-1 rounded text-caption font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <Settings2 className="h-3 w-3" aria-hidden />
          Manage
        </button>
      </div>

      {isLoading ? (
        <p className="px-3 py-3 text-label text-on-surface-variant">Loading…</p>
      ) : total === 0 ? (
        <div className="px-3 py-3">
          <p className="text-label text-on-surface">No quick replies yet.</p>
          <p className="text-caption text-on-surface-variant">
            Save answers you send often, then type / to drop them in.{" "}
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={onManage}
              className="font-semibold text-primary hover:underline"
            >
              Create one
            </button>
          </p>
        </div>
      ) : items.length === 0 ? (
        <p className="px-3 py-3 text-label text-on-surface-variant" role="status">
          No quick reply matches “{filter}”.
        </p>
      ) : (
        <ul id={listboxId} role="listbox" aria-label="Quick replies" className="max-h-60 overflow-y-auto py-1">
          {items.map((r, index) => (
            <li
              key={r.id}
              id={`${listboxId}-${r.id}`}
              role="option"
              aria-selected={index === activeIndex}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => onPick(r)}
              className={cn(
                "cursor-pointer px-3 py-2 transition-colors",
                index === activeIndex ? "bg-primary/10" : "hover:bg-surface-container",
              )}
            >
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
                <span className="truncate text-body font-medium text-on-surface">{r.title}</span>
                {r.shortcut && <span className="shrink-0 font-mono text-caption text-on-surface-variant">/{r.shortcut}</span>}
              </div>
              <p className="ml-5.5 mt-0.5 truncate text-label text-on-surface-variant">{r.content}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
