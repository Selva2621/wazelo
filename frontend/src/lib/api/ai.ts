import apiClient from "./client";
import type {
  SmartRepliesResponse,
  SmartReplyOptions,
  ConversationSummary,
  ReadChatResult,
} from "@/lib/types/ai";

export interface SentimentResult {
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT";
  confidence: number;
  reason: string;
}

export interface CategorizationResult {
  suggestedLabels: string[];
  intent: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  language: string;
}

export interface KbRagResult {
  answer: string;
  sources: { articleId: string; title: string; slug: string; relevance: number }[];
  confidence: number;
}

export interface IntentResult {
  primaryIntent: string;
  subIntent: string | null;
  entities: Record<string, string>;
  suggestedAction: string | null;
}

export interface FullAnalysis {
  sentiment: SentimentResult;
  categorization: CategorizationResult;
  intent: IntentResult;
  kbSuggestions: KbRagResult;
  summary: ConversationSummary;
}

export interface RoutingSuggestion {
  suggestedTeam: string | null;
  reason: string;
  urgency: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  tags: string[];
}

export interface AiInsightsResult {
  summary: string;
  highlights: string[];
  warnings: string[];
  period: "7d" | "30d";
  generatedAt: string;
}

export interface CampaignCopyResult {
  variants: string[];
}

export interface DealScoreResult {
  dealId: string;
  score: number;
  reason: string;
  scoredAt: string;
}

export const aiApi = {
  /** Free: the saved read of a chat and whether the customer has written since */
  peekChat: (conversationId: string) =>
    apiClient.get<ReadChatResult>(`/ai/read-chat/${conversationId}`).then((r) => r.data),

  /** One AI call (1 credit); free when the saved read is still current */
  readChat: (conversationId: string) =>
    apiClient.post<ReadChatResult>(`/ai/read-chat/${conversationId}`).then((r) => r.data),

  getSmartReplies: (conversationId: string, options: SmartReplyOptions = {}) =>
    apiClient
      .get<SmartRepliesResponse>(`/ai/smart-replies/${conversationId}`, {
        params: { tone: options.tone, goal: options.goal?.trim() || undefined },
      })
      .then((r) => r.data),

  summarize: (conversationId: string) =>
    apiClient.post<ConversationSummary>(`/ai/summarize/${conversationId}`).then((r) => r.data),

  getSentiment: (conversationId: string) =>
    apiClient.get<SentimentResult>(`/ai/sentiment/${conversationId}`).then((r) => r.data),

  getCategorization: (conversationId: string) =>
    apiClient.get<CategorizationResult>(`/ai/categorize/${conversationId}`).then((r) => r.data),

  /** Saves the shown tags (and language/intent/priority) onto the chat's contact. Free: no AI call. */
  saveTagsToContact: (
    conversationId: string,
    body: { labels: string[]; language?: string; intent?: string; priority?: CategorizationResult["priority"] },
  ) =>
    apiClient
      .post<{ added: string[]; alreadyHad: string[] }>(`/ai/categorize/${conversationId}/apply`, body)
      .then((r) => r.data),

  kbSearch: (query: string) =>
    apiClient.get<KbRagResult>(`/ai/kb-search`, { params: { q: query } }).then((r) => r.data),

  kbSuggest: (conversationId: string) =>
    apiClient.get<KbRagResult>(`/ai/kb-suggest/${conversationId}`).then((r) => r.data),

  detectIntent: (conversationId: string) =>
    apiClient.get<IntentResult>(`/ai/intent/${conversationId}`).then((r) => r.data),

  fullAnalysis: (conversationId: string) =>
    apiClient.post<FullAnalysis>(`/ai/analyze/${conversationId}`).then((r) => r.data),

  getRoutingSuggestion: (conversationId: string) =>
    apiClient.get<RoutingSuggestion>(`/ai/routing/${conversationId}`).then((r) => r.data),

  getInsights: (period: "7d" | "30d" = "7d") =>
    apiClient.get<AiInsightsResult>(`/ai/insights`, { params: { period } }).then((r) => r.data),

  generateCampaignCopy: (params: {
    goal: string;
    audienceDesc?: string;
    tone?: string;
    variants?: number;
  }) =>
    apiClient.post<CampaignCopyResult>(`/campaigns/generate-copy`, params).then((r) => r.data),

  scoreDeal: (pipelineId: string, dealId: string) =>
    apiClient.post<DealScoreResult>(`/pipelines/${pipelineId}/deals/${dealId}/score`).then((r) => r.data),
};
