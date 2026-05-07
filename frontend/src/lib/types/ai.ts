export interface SmartRepliesResponse {
  replies: string[];
}

export interface ConversationSummary {
  id: string;
  conversationId: string;
  orgId: string;
  summary: string;
  keyTopics: string[];
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
  generatedAt: string;
}
