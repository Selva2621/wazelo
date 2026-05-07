"use client";

import { Sparkles } from "lucide-react";
import { useSmartReplies } from "@/hooks/use-ai";
import { Spinner } from "@/components/ui/spinner";

interface AiReplySuggestionsProps {
  conversationId: string | null;
  onSelect: (text: string) => void;
}

export function AiReplySuggestions({ conversationId, onSelect }: AiReplySuggestionsProps) {
  const { data, isLoading, isError } = useSmartReplies(conversationId);

  if (!conversationId || isError) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-outline-variant/10 bg-surface-container/20 overflow-x-auto">
      <div className="flex items-center gap-1 shrink-0 text-primary/60">
        {isLoading ? (
          <Spinner size="sm" className="text-primary/40" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        <span className="text-[10px] font-medium uppercase tracking-wider">AI</span>
      </div>
      {data?.replies.map((reply, i) => (
        <button
          key={i}
          onClick={() => onSelect(reply)}
          className="shrink-0 px-3 py-1.5 rounded-full bg-primary/5 border border-primary/10 text-[12px] text-on-surface hover:bg-primary/10 hover:border-primary/20 transition-colors whitespace-nowrap"
        >
          {reply.length > 60 ? reply.slice(0, 57) + "..." : reply}
        </button>
      ))}
    </div>
  );
}
