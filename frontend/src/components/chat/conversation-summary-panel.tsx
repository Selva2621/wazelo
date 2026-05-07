"use client";

import { useState } from "react";
import { Sparkles, X, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useSummarizeConversation } from "@/hooks/use-ai";
import type { ConversationSummary } from "@/lib/types/ai";

interface ConversationSummaryPanelProps {
  conversationId: string;
}

export function ConversationSummaryPanel({ conversationId }: ConversationSummaryPanelProps) {
  const [summary, setSummary] = useState<ConversationSummary | null>(null);
  const [showPanel, setShowPanel] = useState(false);
  const summarize = useSummarizeConversation();

  const handleSummarize = () => {
    summarize.mutate(conversationId, {
      onSuccess: (data) => {
        setSummary(data);
        setShowPanel(true);
      },
    });
  };

  const sentimentIcon = {
    POSITIVE: <TrendingUp className="h-3.5 w-3.5 text-success" />,
    NEGATIVE: <TrendingDown className="h-3.5 w-3.5 text-error" />,
    NEUTRAL: <Minus className="h-3.5 w-3.5 text-on-surface-variant" />,
  };

  if (!showPanel) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleSummarize}
        disabled={summarize.isPending}
        className="text-primary/70 hover:text-primary"
      >
        {summarize.isPending ? (
          <Spinner size="sm" className="mr-1.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 mr-1.5" />
        )}
        Summarize
      </Button>
    );
  }

  return (
    <div className="mx-4 mb-2 rounded-xl bg-primary/5 border border-primary/10 p-3.5">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-[12px] font-semibold text-primary">AI Summary</span>
        </div>
        <button onClick={() => setShowPanel(false)} className="text-on-surface-variant/40 hover:text-on-surface-variant">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {summary && (
        <>
          <p className="text-[13px] text-on-surface leading-relaxed">{summary.summary}</p>

          <div className="flex items-center gap-2 mt-2.5 flex-wrap">
            {summary.sentiment && (
              <Badge variant="muted" className="text-[10px]">
                {sentimentIcon[summary.sentiment]}
                <span className="ml-1">{summary.sentiment}</span>
              </Badge>
            )}
            {summary.keyTopics.map((topic) => (
              <Badge key={topic} variant="default" className="text-[10px]">
                {topic}
              </Badge>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
