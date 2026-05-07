"use client";

import { useState } from "react";
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
  useDetectIntent, useKbSuggest, useFullAnalysis,
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

export function AiInsightPanel({ conversationId }: AiInsightPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [showKb, setShowKb] = useState(false);

  const sentiment = useSentiment(conversationId);
  const categorization = useCategorization(conversationId);
  const intent = useDetectIntent(conversationId);
  const kbSuggest = useKbSuggest(showKb ? conversationId : null);
  const applyCat = useApplyCategorization();
  const fullAnalysis = useFullAnalysis();

  if (!conversationId) return null;

  const isLoading = sentiment.isLoading || categorization.isLoading || intent.isLoading;

  return (
    <div className="border-t border-outline-variant/15 bg-surface-container/30">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full px-4 py-2 hover:bg-surface-container/50 transition-colors"
      >
        <span className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
          <Brain className="h-3.5 w-3.5" />
          AI Insights
          {sentiment.data?.sentiment === "URGENT" && (
            <Badge variant="error" className="ml-1 text-[10px] px-1.5 py-0">URGENT</Badge>
          )}
        </span>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-on-surface-variant" /> : <ChevronDown className="h-3.5 w-3.5 text-on-surface-variant" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2.5">
          {isLoading ? (
            <div className="flex items-center justify-center py-3">
              <Spinner size="sm" className="text-primary" />
              <span className="text-[11px] text-on-surface-variant ml-2">Analyzing conversation...</span>
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
                        <span className={`text-[11px] font-medium ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-[10px] text-on-surface-variant/50">
                          {Math.round(sentiment.data.confidence * 100)}%
                        </span>
                      </div>
                    );
                  })()}
                  {sentiment.data.reason && (
                    <span className="text-[10px] text-on-surface-variant/60 truncate flex-1">{sentiment.data.reason}</span>
                  )}
                </div>
              )}

              {/* Intent */}
              {intent.data && intent.data.primaryIntent !== "unknown" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Target className="h-3 w-3 text-info" />
                    <span className="font-medium text-on-surface">
                      {intentLabels[intent.data.primaryIntent] || intent.data.primaryIntent}
                    </span>
                    {intent.data.subIntent && (
                      <span className="text-on-surface-variant/60">→ {intent.data.subIntent}</span>
                    )}
                  </div>
                  {intent.data.suggestedAction && intent.data.suggestedAction !== "no_action" && (
                    <Badge variant="info" className="text-[10px] px-1.5 py-0">
                      <ArrowRight className="h-2.5 w-2.5 mr-0.5" />
                      {actionLabels[intent.data.suggestedAction] || intent.data.suggestedAction}
                    </Badge>
                  )}
                </div>
              )}

              {/* Extracted Entities */}
              {intent.data && Object.keys(intent.data.entities).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {Object.entries(intent.data.entities).map(([key, value]) => (
                    <span key={key} className="text-[10px] bg-surface-container rounded px-1.5 py-0.5 text-on-surface-variant">
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
                    <Badge key={label} variant="muted" className="text-[10px] px-1.5 py-0">{label}</Badge>
                  ))}
                  <button
                    onClick={() => applyCat.mutate(conversationId)}
                    disabled={applyCat.isPending}
                    className="text-[10px] text-primary hover:underline ml-1"
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
                    className="text-[10px] px-1.5 py-0"
                  >
                    {categorization.data.priority} priority
                  </Badge>
                  <span className="text-[10px] text-on-surface-variant/50">
                    Language: {categorization.data.language.toUpperCase()}
                  </span>
                </div>
              )}

              {/* KB Suggestions toggle */}
              <div className="flex items-center gap-2 pt-1 border-t border-outline-variant/10">
                <button
                  onClick={() => setShowKb(!showKb)}
                  className="flex items-center gap-1 text-[11px] text-primary hover:underline"
                >
                  <BookOpen className="h-3 w-3" />
                  {showKb ? "Hide KB Suggestions" : "Find KB Articles"}
                </button>
              </div>

              {/* KB Suggestions */}
              {showKb && kbSuggest.data && (
                <div className="space-y-1.5 pl-1">
                  {kbSuggest.data.answer ? (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-2">
                      <p className="text-[11px] text-on-surface leading-relaxed">{kbSuggest.data.answer}</p>
                      {kbSuggest.data.sources.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {kbSuggest.data.sources.map((s) => (
                            <span key={s.articleId} className="text-[10px] text-primary/70 bg-primary/5 rounded px-1.5 py-0.5">
                              📄 {s.title}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : kbSuggest.isLoading ? (
                    <div className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                      <Spinner size="sm" /> Searching knowledge base...
                    </div>
                  ) : (
                    <p className="text-[11px] text-on-surface-variant/50">No relevant KB articles found.</p>
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
