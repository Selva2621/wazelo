"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { MessageSquareText } from "lucide-react";
import { useCannedResponses } from "@/hooks/use-canned-responses";
import { cannedResponsesApi } from "@/lib/api/canned-responses";
import type { CannedResponse } from "@/lib/types/canned-responses";

interface CannedResponsePickerProps {
  open: boolean;
  filter: string;
  onSelect: (content: string) => void;
  onClose: () => void;
}

export function CannedResponsePicker({
  open,
  filter,
  onSelect,
  onClose,
}: CannedResponsePickerProps) {
  const { data: responses } = useCannedResponses();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!responses) return [];
    if (!filter) return responses;
    const q = filter.toLowerCase();
    return responses.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.shortcut && r.shortcut.toLowerCase().includes(q)) ||
        r.content.toLowerCase().includes(q),
    );
  }, [responses, filter]);

  // Reset selection when filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [filter]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        handleSelect(filtered[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, filtered, selectedIndex]);

  const handleSelect = (response: CannedResponse) => {
    onSelect(response.content);
    cannedResponsesApi.recordUsage(response.id).catch(() => {});
    onClose();
  };

  if (!open || filtered.length === 0) return null;

  return (
    <div
      ref={listRef}
      className="absolute bottom-full left-0 right-0 mb-1 max-h-[240px] overflow-y-auto rounded-xl border border-outline-variant/20 bg-surface-container-lowest shadow-lg z-50"
    >
      <div className="px-3 py-2 border-b border-outline-variant/10">
        <p className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider">
          Quick Replies
        </p>
      </div>
      {filtered.slice(0, 10).map((response, index) => (
        <button
          key={response.id}
          onClick={() => handleSelect(response)}
          className={`w-full text-left px-3 py-2.5 transition-colors ${
            index === selectedIndex
              ? "bg-primary/10"
              : "hover:bg-surface-container"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquareText className="h-3.5 w-3.5 text-primary shrink-0" />
            <span className="text-[13px] font-medium text-on-surface truncate">
              {response.title}
            </span>
            {response.shortcut && (
              <span className="text-[11px] text-on-surface-variant/50 font-mono shrink-0">
                /{response.shortcut}
              </span>
            )}
          </div>
          <p className="text-[12px] text-on-surface-variant/70 truncate mt-0.5 ml-5.5">
            {response.content}
          </p>
        </button>
      ))}
    </div>
  );
}
