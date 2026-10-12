"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const RECENT_KEY = "wazelo:recent-emojis";
const RECENT_LIMIT = 16;

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Smileys",
    emojis: ["😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉", "😍", "🥰", "😘", "😋", "😎", "🤩", "🤔", "🤗", "😐", "😅", "😬", "🙄", "😴", "😢", "😭", "😡", "🥳", "😮", "🤯", "😱"],
  },
  {
    label: "Gestures",
    emojis: ["👍", "👎", "👌", "✌️", "🤞", "🙏", "👏", "🙌", "👋", "🤝", "💪", "👉", "👆", "✍️"],
  },
  {
    label: "Symbols",
    emojis: ["❤️", "💚", "💙", "💛", "🧡", "💜", "🔥", "✨", "⭐", "🎉", "🎁", "✅", "❌", "⚠️", "💯", "❓", "❗", "💬", "📌", "⏰"],
  },
  {
    label: "Business",
    emojis: ["📞", "📱", "💻", "📧", "📅", "📦", "🚚", "💰", "💳", "🧾", "📈", "📊", "🏷️", "🛒", "🏠", "📍"],
  },
];

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((e) => typeof e === "string") : [];
  } catch {
    return [];
  }
}

function saveRecent(emoji: string, current: string[]): string[] {
  const next = [emoji, ...current.filter((e) => e !== emoji)].slice(0, RECENT_LIMIT);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode) — recents just won't persist
  }
  return next;
}

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

/** Lightweight emoji popover anchored above the chat input. Render it only while open. */
export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [recent, setRecent] = useState<string[]>(readRecent);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const target = e.target as HTMLElement;
      if (panelRef.current?.contains(target) || target.closest("[data-emoji-trigger]")) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const handlePick = (emoji: string) => {
    setRecent((cur) => saveRecent(emoji, cur));
    onSelect(emoji);
  };

  const groups = recent.length > 0 ? [{ label: "Recent", emojis: recent }, ...EMOJI_GROUPS] : EMOJI_GROUPS;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Emoji picker"
      className="absolute bottom-full left-0 mb-2 w-[min(320px,calc(100vw-2rem))] max-h-[280px] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-2 shadow-popover z-50"
    >
      {groups.map((group) => (
        <div key={group.label} className="mb-1.5 last:mb-0">
          <p className="px-1.5 pb-1 pt-0.5 text-caption font-medium uppercase tracking-wider text-on-surface-variant">
            {group.label}
          </p>
          <div className="grid grid-cols-8 gap-0.5">
            {group.emojis.map((emoji) => (
              <button
                key={`${group.label}-${emoji}`}
                type="button"
                onClick={() => handlePick(emoji)}
                aria-label={emoji}
                className={cn(
                  "flex h-9 w-full items-center justify-center rounded-lg text-title-sm leading-none transition-transform duration-120 ease-standard",
                  "hover:bg-surface-container hover:scale-110 focus-visible:bg-surface-container",
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
