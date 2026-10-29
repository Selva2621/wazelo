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

/** Who wrote it: the visitor, a person on the team, or the AI assistant */
export type WebsiteChatSender = "visitor" | "agent" | "bot";

export interface WebsiteChatSummary {
  id: string;
  visitorName: string | null;
  visitorPhone: string | null;
  visitorEmail: string | null;
  pageUrl: string | null;
  status: "open" | "closed";
  lastMessage: { body: string; sender: WebsiteChatSender; createdAt: string } | null;
  /** The visitor wrote last: someone should reply */
  waiting: boolean;
  updatedAt: string;
}

export interface WebsiteChatMessage {
  id: string;
  sender: WebsiteChatSender;
  body: string;
  createdAt: string;
}

export async function listWebsiteChats(status: "open" | "closed" = "open"): Promise<{ data: WebsiteChatSummary[]; total: number }> {
  const { data } = await apiClient.get("/widget/chats", { params: { status } });
  return data;
}

export async function getWebsiteChat(id: string): Promise<{
  chat: Omit<WebsiteChatSummary, "lastMessage" | "waiting" | "updatedAt">;
  messages: WebsiteChatMessage[];
}> {
  const { data } = await apiClient.get(`/widget/chats/${id}/messages`);
  return data;
}

export async function replyToWebsiteChat(id: string, body: string): Promise<WebsiteChatMessage> {
  const { data } = await apiClient.post(`/widget/chats/${id}/reply`, { body });
  return data;
}

export async function setWebsiteChatStatus(id: string, status: "open" | "closed"): Promise<void> {
  await apiClient.post(`/widget/chats/${id}/status`, { status });
}
