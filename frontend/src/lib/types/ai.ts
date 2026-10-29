export interface SmartRepliesResponse {
  replies: string[];
  /** Titles of the website pages, files and FAQs the replies drew on */
  sources: string[];
}

export type ReplyTone = "friendly" | "formal" | "short";

/** What one AI read of a chat found */
export interface ChatReadout {
  mood: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | "URGENT";
  /** 0–1: how sure the AI is about the mood */
  confidence: number;
  moodReason: string;
  wants: string;
  wantsDetail: string;
  nextStep: string;
  mentioned: Record<string, string>;
  tags: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  /** ISO 639-1 */
  language: string;
}

export type ReadChatResult =
  | { status: "no_customer_messages" }
  | { status: "not_read" }
  | {
      status: "ready";
      readout: ChatReadout;
      readAt: string;
      /** False when the customer has written since; reading again then costs credits */
      upToDate: boolean;
    };

export interface SmartReplyOptions {
  tone?: ReplyTone;
  /** What the reply should do, e.g. "ask for their budget" (max 200 chars) */
  goal?: string;
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
