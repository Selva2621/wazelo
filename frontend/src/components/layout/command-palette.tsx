"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  User,
  MessageSquare,
  Megaphone,
  X,
} from "lucide-react";
import { useGlobalSearch } from "@/hooks/use-search";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { data, isLoading } = useGlobalSearch(query);

  // Build flat result list for keyboard navigation
  const results: { type: string; id: string; label: string; sub: string; href: string }[] = [];
  if (data) {
    for (const c of data.contacts) {
      results.push({
        type: "contact",
        id: c.id,
        label: c.name || c.phoneNumber,
        sub: c.name ? c.phoneNumber : (c.email || ""),
        href: `/contacts?id=${c.id}`,
      });
    }
    for (const c of data.conversations) {
      results.push({
        type: "conversation",
        id: c.id,
        label: c.contactPhone,
        sub: c.lastMessageBody
          ? c.lastMessageBody.slice(0, 60)
          : `Conversation - ${c.status}`,
        href: `/inbox?conversation=${c.id}`,
      });
    }
    for (const c of data.campaigns) {
      results.push({
        type: "campaign",
        id: c.id,
        label: c.name,
        sub: `${c.status} - ${c.totalRecipients} recipients`,
        href: `/campaigns/${c.id}`,
      });
    }
  }

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [data]);

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        e.preventDefault();
        router.push(results[selectedIndex].href);
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, selectedIndex, router, onClose],
  );

  // Global ⌘K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        // Opening is handled by parent
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const iconMap: Record<string, typeof User> = {
    contact: User,
    conversation: MessageSquare,
    campaign: Megaphone,
  };

  const hasResults = results.length > 0;
  const hasQuery = query.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Palette */}
      <div className="relative w-full max-w-xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/15 overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant/15">
          <Search className="h-5 w-5 text-on-surface-variant/50 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search contacts, conversations, campaigns..."
            className="flex-1 bg-transparent text-[15px] text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none"
          />
          {isLoading && <Spinner size="sm" />}
          <button
            onClick={onClose}
            className="text-on-surface-variant/40 hover:text-on-surface-variant"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {!hasQuery && (
            <div className="px-5 py-8 text-center text-[13px] text-on-surface-variant/40">
              Type at least 2 characters to search
            </div>
          )}

          {hasQuery && !isLoading && !hasResults && (
            <div className="px-5 py-8 text-center text-[13px] text-on-surface-variant/40">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {hasResults && (
            <div className="py-2">
              {/* Group: Contacts */}
              {data!.contacts.length > 0 && (
                <div>
                  <p className="px-5 py-1.5 text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                    Contacts
                  </p>
                  {results
                    .filter((r) => r.type === "contact")
                    .map((r, i) => {
                      const globalIdx = results.indexOf(r);
                      const Icon = iconMap[r.type];
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            router.push(r.href);
                            onClose();
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                            globalIdx === selectedIndex
                              ? "bg-primary/10"
                              : "hover:bg-surface-container/30",
                          )}
                        >
                          <Icon className="h-4 w-4 text-on-surface-variant/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-on-surface truncate">
                              {r.label}
                            </p>
                            {r.sub && (
                              <p className="text-[11px] text-on-surface-variant/60 truncate">
                                {r.sub}
                              </p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Group: Conversations */}
              {data!.conversations.length > 0 && (
                <div>
                  <p className="px-5 py-1.5 text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                    Conversations
                  </p>
                  {results
                    .filter((r) => r.type === "conversation")
                    .map((r) => {
                      const globalIdx = results.indexOf(r);
                      const Icon = iconMap[r.type];
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            router.push(r.href);
                            onClose();
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                            globalIdx === selectedIndex
                              ? "bg-primary/10"
                              : "hover:bg-surface-container/30",
                          )}
                        >
                          <Icon className="h-4 w-4 text-on-surface-variant/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-on-surface truncate">
                              {r.label}
                            </p>
                            <p className="text-[11px] text-on-surface-variant/60 truncate">
                              {r.sub}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}

              {/* Group: Campaigns */}
              {data!.campaigns.length > 0 && (
                <div>
                  <p className="px-5 py-1.5 text-[10px] font-semibold text-on-surface-variant/50 uppercase tracking-wider">
                    Campaigns
                  </p>
                  {results
                    .filter((r) => r.type === "campaign")
                    .map((r) => {
                      const globalIdx = results.indexOf(r);
                      const Icon = iconMap[r.type];
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            router.push(r.href);
                            onClose();
                          }}
                          className={cn(
                            "w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors",
                            globalIdx === selectedIndex
                              ? "bg-primary/10"
                              : "hover:bg-surface-container/30",
                          )}
                        >
                          <Icon className="h-4 w-4 text-on-surface-variant/50 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-medium text-on-surface truncate">
                              {r.label}
                            </p>
                            <p className="text-[11px] text-on-surface-variant/60 truncate">
                              {r.sub}
                            </p>
                          </div>
                          <Badge variant="muted">{r.sub.split(" - ")[0]}</Badge>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {hasResults && (
          <div className="px-5 py-2 border-t border-outline-variant/10 flex items-center gap-4 text-[11px] text-on-surface-variant/40">
            <span><kbd className="px-1 py-0.5 rounded bg-surface-container text-[10px]">↑↓</kbd> Navigate</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface-container text-[10px]">↵</kbd> Open</span>
            <span><kbd className="px-1 py-0.5 rounded bg-surface-container text-[10px]">Esc</kbd> Close</span>
          </div>
        )}
      </div>
    </div>
  );
}
