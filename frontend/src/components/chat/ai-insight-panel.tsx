"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAiCredits } from "@/hooks/use-ai-credits";
import {
  Brain, TrendingUp, Tag, Target, BookOpen, Sparkles,
  ChevronDown, ChevronUp, AlertTriangle, Smile, Meh, Frown,
  ArrowRight, Search,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  useSentiment, useCategorization, useApplyCategorization,
  useDetectIntent, useKbSuggest,
} from "@/hooks/use-ai";

interface AiInsightPanelProps {
  conversationId: string | null;
}

const sentimentConfig = {
  POSITIVE: { icon: Smile, color: "text-success", bg: "bg-success/10", label: "Positive" },
  NEUTRAL: { icon: Meh, color: "text-on-surface-variant", bg: "bg-surface-container", label: "Neutral" },
  NEGATIVE: { icon: Frown, color: "text-warning", bg: "bg-warning/10", label: "Negative" },
  URGENT: { icon: AlertTriangle, color: "text-error", bg: "bg-error/10", label: "Urgent" },
} as const;

const intentLabels: Record<string, string> = {
  purchase: "Purchase Intent",
  support: "Support Request",
  complaint: "Complaint",
  billing: "Billing Issue",
  appointment: "Appointment",
  information: "Info Request",
  feedback: "Feedback",
  cancellation: "Cancellation",
  referral: "Referral",
  spam: "Spam",
  other: "Other",
};

const actionLabels: Record<string, string> = {
  assign_to_sales: "Assign to Sales",
  assign_to_support: "Assign to Support",
  create_ticket: "Create Ticket",
  send_catalog: "Send Catalog",
  schedule_callback: "Schedule Callback",
  escalate: "Escalate",
  send_invoice: "Send Invoice",
  no_action: "No Action Needed",
};

const INSIGHT_KEYS = ["sentiment", "categorization", "intent"] as const;
const INSIGHT_ACTIONS = ["sentiment", "categorize", "intent"];

/** AI sometimes writes "null" / "none" as text; hide those. */
const shown = (value: string | null | undefined) =>
  value && !/^(null|none|n\/a|undefined)$/i.test(value.trim()) ? value : null;

export function AiInsightPanel({ conversationId }: AiInsightPanelProps) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(true);
  const [showKb, setShowKb] = useState(false);
  // Analysis costs credits, so it runs only when asked (or was already run this session)
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const cached = !!conversationId && qc.getQueryData(["ai", "sentiment", conversationId]) !== undefined;
  const active = !!conversationId && (requestedFor === conversationId || cached);

  const sentiment = useSentiment(conversationId, active);
  const categorization = useCategorization(conversationId, active);
  const intent = useDetectIntent(conversationId, active);
  const kbSuggest = useKbSuggest(showKb ? conversationId : null);
  const applyCat = useApplyCategorization();
  const { data: credits } = useAiCredits();
  const cost = credits
    ? credits.costs.filter((c) => INSIGHT_ACTIONS.includes(c.action)).reduce((n, c) => n + c.cost, 0)
    : INSIGHT_ACTIONS.length;

  if (!conversationId) return null;

  const isLoading = active && (sentiment.isFetching || categorization.isFetching || intent.isFetching);
  const reanalyze = () => {
    for (const key of INSIGHT_KEYS) qc.invalidateQueries({ queryKey: ["ai", key, conversationId] });
  };
  const costLabel = cost === 0 ? "free" : `${cost} credit${cost === 1 ? "" : "s"}`;

  return (
    <div className="border-t border-outline-variant/15 bg-surface-container/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-surface-container/50 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-label font-semibold text-primary">
          <Brain className="h-3.5 w-3.5" />
          AI Insights
          {sentiment.data?.sentiment === "URGENT" && (
            <Badge variant="error" className="ml-1 text-caption px-1.5 py-0">URGENT</Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-on-surface-variant" /> : <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2.5">
          {!active ? (
            <div className="flex flex-wrap items-center justify-between gap-2 py-1">
              <span className="text-caption text-on-surface-variant">
                Sentiment, intent and labels for this chat.
              </span>
              <Button size="sm" variant="secondary" onClick={() => setRequestedFor(conversationId)}>
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Analyze · {costLabel}
              </Button>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Spinner size="sm" className="text-primary" />
              <span className="text-caption text-on-surface-variant ml-2">Analyzing conversation...</span>
            </div>
          ) : (
            <>
              {/* Sentiment */}
              {sentiment.data && (
                <div className="flex items-center gap-2">
                  {(() => {
                    const cfg = sentimentConfig[sentiment.data.sentiment] || sentimentConfig.NEUTRAL;
                    const Icon = cfg.icon;
                    return (
                      <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${cfg.bg}`}>
                        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                        <span className={`text-caption font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-caption text-on-surface-variant/50">
                          {Math.round(sentiment.data.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })()}
                  {sentiment.data.reason && (
                    <span className="text-caption text-on-surface-variant/60 truncate flex-1">{sentiment.data.reason}</span>
                  )}
                </div>
              )}

              {/* Intent */}
              {intent.data && intent.data.primaryIntent !== "unknown" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-caption">
                    <Target className="h-3 w-3 text-info" />
                    <span className="font-medium text-on-surface">
                      {intentLabels[intent.data.primaryIntent] || intent.data.primaryIntent}
                    </span>
                    {shown(intent.data.subIntent) && (
                      <span className="text-on-surface-variant/60">→ {shown(intent.data.subIntent)}</span>
                    )}
                  </div>
                  {shown(intent.data.suggestedAction) && intent.data.suggestedAction !== "no_action" && (
                    <Badge variant="info" className="text-caption px-1.5 py-0">
                      <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
                      {actionLabels[intent.data.suggestedAction ?? ""] || intent.data.suggestedAction}
                    </Badge>
                  )}
                </div>
              )}

              {/* Extracted Entities */}
              {intent.data && Object.keys(intent.data.entities).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(intent.data.entities).map(([key, value]) => (
                    <span key={key} className="text-caption bg-surface-container rounded px-1.5 py-0.5 text-on-surface-variant">
                      <span className="font-medium">{key}:</span> {value}
                    </span>
                  ))}
                </div>
              )}

              {/* Suggested Labels */}
              {categorization.data && categorization.data.suggestedLabels.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag className="h-3 w-3 text-on-surface-variant/50" />
                  {categorization.data.suggestedLabels.map((label) => (
                    <Badge key={label} variant="muted" className="text-caption px-1.5 py-0">{label}</Badge>
                  ))}
                  <button
                    onClick={() => applyCat.mutate(conversationId)}
                    disabled={applyCat.isPending}
                    className="text-caption text-primary hover:underline ml-1"
                  >
                    {applyCat.isPending ? "Applying..." : "Apply"}
                  </button>
                </div>
              )}

              {/* Priority + Language */}
              {categorization.data && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      categorization.data.priority === "URGENT" ? "error" :
                      categorization.data.priority === "HIGH" ? "warning" :
                      categorization.data.priority === "MEDIUM" ? "info" : "muted"
                    }
                    className="text-caption px-1.5 py-0"
                  >
                    {categorization.data.priority} priority
                  </Badge>
                  <span className="text-caption text-on-surface-variant/50">
                    Language: {categorization.data.language.toUpperCase()}
                  </span>
                </div>
              )}

              {/* KB Suggestions toggle + re-run */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-outline-variant/10">
                <button
                  onClick={() => setShowKb(!showKb)}
                  className="flex items-center gap-1 text-caption text-primary hover:underline"
                >
                  <BookOpen className="h-3 w-3" />
                  {showKb ? "Hide KB Suggestions" : "Find KB Articles"}
                </button>
                <button
                  onClick={reanalyze}
                  className="text-caption text-on-surface-variant hover:text-primary hover:underline"
                  title={`Runs the analysis again (${costLabel})`}
                >
                  Re-analyze
                </button>
              </div>

              {/* KB Suggestions */}
              {showKb && kbSuggest.data && (
                <div className="space-y-1.5 pl-1">
                  {kbSuggest.data.answer ? (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-2">
                      <p className="text-caption text-on-surface leading-relaxed">{kbSuggest.data.answer}</p>
                      {kbSuggest.data.sources.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {kbSuggest.data.sources.map((s) => (
                            <span key={s.articleId} className="text-caption text-primary/70 bg-primary/5 rounded px-1.5 py-0.5">
                              {s.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : kbSuggest.isLoading ? (
                    <div className="flex items-center gap-1.5 text-caption text-on-surface-variant">
                      <Spinner size="sm" /> Searching knowledge base...
                    </div>
                  ) : (
                    <p className="text-caption text-on-surface-variant/50">No relevant KB articles found.</p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
