"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Sparkles } from "lucide-react";
import { useSmartReplies } from "@/hooks/use-ai";
import { useAiCredits } from "@/hooks/use-ai-credits";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";

interface AiReplySuggestionsProps {
  conversationId: string | null;
  onSelect: (text: string) => void;
}

export function AiReplySuggestions({ conversationId, onSelect }: AiReplySuggestionsProps) {
  const qc = useQueryClient();
  // Suggestions cost credits, so they load only when asked (or were already loaded this session)
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const cached = !!conversationId && qc.getQueryData(["ai", "smart-replies", conversationId]) !== undefined;
  const active = !!conversationId && (requestedFor === conversationId || cached);
  const { data, isFetching, isError } = useSmartReplies(conversationId, active);
  const { data: credits } = useAiCredits();
  const cost = credits ? (credits.costs.find((c) => c.action === "smart_reply")?.cost ?? 0) : 1;

  if (!conversationId || isError) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-t border-outline-variant/10 bg-surface-container/20 overflow-x-auto">
      <div className="flex items-center gap-1 shrink-0 text-primary/60">
        {isFetching ? <Spinner size="sm" className="text-primary/40" /> : <Sparkles className="h-3.5 w-3.5" />}
        <span className="text-caption font-medium uppercase tracking-wider">AI</span>
      </div>

      {!active ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setRequestedFor(conversationId)}
          className="shrink-0 bg-primary/5 border-primary/10 hover:bg-primary/10"
        >
          Suggest replies · {cost === 0 ? "free" : `${cost} credit${cost === 1 ? "" : "s"}`}
        </Button>
      ) : (
        <>
          {data?.replies.map((reply, i) => (
            <Button
              variant="secondary"
              size="sm"
              key={i}
              onClick={() => onSelect(reply)}
              title={reply}
              className="shrink-0 bg-primary/5 border-primary/10 hover:bg-primary/10 hover:border-primary/20 whitespace-nowrap"
            >
              {reply.length > 60 ? reply.slice(0, 57) + "..." : reply}
            </Button>
          ))}
          {data && !isFetching && (
            <button
              type="button"
              onClick={() => qc.invalidateQueries({ queryKey: ["ai", "smart-replies", conversationId] })}
              className="shrink-0 rounded p-1 text-on-surface-variant hover:text-primary"
              aria-label="Suggest new replies"
              title="Suggest new replies"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
