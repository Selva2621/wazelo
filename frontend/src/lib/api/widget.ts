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
