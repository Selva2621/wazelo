import apiClient from "./client";

export interface WidgetConfig {
  id?: string;
  orgId?: string;
  orgSlug?: string;
  enabled: boolean;
  position: string;
  primaryColor: string;
  welcomeMessage: string;
  placeholder: string;
  companyName: string | null;
  avatarUrl: string | null;
  whatsappNumber: string | null;
  preChatFormEnabled: boolean;
  aiAssistantEnabled: boolean;
  aiSystemPrompt?: string | null;
}

export async function getWidgetConfig(): Promise<WidgetConfig> {
  const { data } = await apiClient.get("/widget/config");
  return data;
}

export async function updateWidgetConfig(config: Partial<WidgetConfig>): Promise<WidgetConfig> {
  const { data } = await apiClient.put("/widget/config", config);
  return data;
}

// ─── Website chats (Inbox → Website) ───

/** Who wrote it: the visitor, a person on the team, the AI assistant, or a notice ("Priya joined the chat") */
export type WebsiteChatSender = "visitor" | "agent" | "bot" | "system";

/** Who is answering: the AI, nobody yet (asked for a person), a team member, or nobody (ended) */
export type WebsiteChatState = "AI" | "WAITING" | "PERSON" | "ENDED";

export interface WebsiteChatSummary {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: "open" | "closed";
  state: WebsiteChatState;
  assignedTo: { id: string; name: string } | null;
  /** When the visitor asked for a person */
  handoffRequestedAt: string | null;
  /** This chat was offered to me (accept / decline) */
  offeredToMe: boolean;
  leadDecision: "LEAD" | "NOT_LEAD" | null;
  consentChannel: string | null;
  lastMessage: { body: string; sender: WebsiteChatSender; createdAt: string } | null;
  /** The visitor wrote last: someone should reply */
  waiting: boolean;
  updatedAt: string;
}

export interface WebsiteChatDetail {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: "open" | "closed";
  state: WebsiteChatState;
  assignedTo: { id: string; name: string } | null;
  handoffRequestedAt: string | null;
  handoffReason: string | null;
  consentChannel: string | null;
  consentAt: string | null;
  contactId: string | null;
  leadDecision: "LEAD" | "NOT_LEAD" | null;
  endedAt: string | null;
  endReason: string | null;
}

export interface WebsiteChatMessage {
  id: string;
  sender: WebsiteChatSender;
  body: string;
  createdAt: string;
  /** The team member who wrote it */
  senderName?: string | null;
}

export interface WebsiteChatEvent {
  id: string;
  type: string;
  actorType: "visitor" | "ai" | "user" | "system";
  actorId: string | null;
  actorName: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
}

export interface WebsiteChatAiSummary {
  summary: string;
  openQuestions: string[];
  mentioned: Record<string, string>;
  leadHint: "LIKELY" | "MAYBE" | "UNLIKELY";
}

export async function listWebsiteChats(status: "open" | "closed" = "open"): Promise<{ data: WebsiteChatSummary[]; total: number }> {
  const { data } = await apiClient.get("/widget/chats", { params: { status } });
  return data;
}

export async function getWebsiteChat(id: string): Promise<{ chat: WebsiteChatDetail; messages: WebsiteChatMessage[] }> {
  const { data } = await apiClient.get(`/widget/chats/${id}/messages`);
  return data;
}

export async function acceptWebsiteChat(id: string): Promise<void> {
  await apiClient.post(`/widget/chats/${id}/accept`);
}

export async function declineWebsiteChat(id: string): Promise<void> {
  await apiClient.post(`/widget/chats/${id}/decline`);
}

/** Give the chat back to the AI assistant */
export async function releaseWebsiteChat(id: string): Promise<void> {
  await apiClient.post(`/widget/chats/${id}/release`);
}

export async function decideWebsiteLead(
  id: string,
  body: { decision: "LEAD" | "NOT_LEAD"; phone?: string },
): Promise<{ decision: "LEAD" | "NOT_LEAD"; contactId: string | null; consent?: boolean }> {
  const { data } = await apiClient.post(`/widget/chats/${id}/lead`, body);
  return data;
}

export async function getWebsiteChatTimeline(id: string): Promise<WebsiteChatEvent[]> {
  const { data } = await apiClient.get(`/widget/chats/${id}/timeline`);
  return data;
}

export async function summarizeWebsiteChat(id: string): Promise<WebsiteChatAiSummary> {
  const { data } = await apiClient.post(`/widget/chats/${id}/ai/summary`);
  return data;
}

export async function suggestWebsiteReplies(id: string): Promise<{ replies: string[]; sources: string[] }> {
  const { data } = await apiClient.post(`/widget/chats/${id}/ai/suggestions`);
  return data;
}

export async function replyToWebsiteChat(id: string, body: string): Promise<WebsiteChatMessage> {
  const { data } = await apiClient.post(`/widget/chats/${id}/reply`, { body });
  return data;
}

export async function setWebsiteChatStatus(id: string, status: "open" | "closed"): Promise<void> {
  await apiClient.post(`/widget/chats/${id}/status`, { status });
}
