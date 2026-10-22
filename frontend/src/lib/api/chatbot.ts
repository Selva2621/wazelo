import apiClient from "./client";
import type {
  ChatbotFlow,
  CreateFlowRequest,
  UpdateFlowRequest,
  SaveNodesRequest,
  ChatbotFlowAnalytics,
  SimulateFlowRequest,
  SimulateFlowResponse,
} from "@/lib/types/chatbot";

/** How the AI bot hands chats over to the team, and the team's opening hours. */
export interface BotBehavior {
  handoffMessage: string;
  hoursEnabled: boolean;
  /** Minutes from midnight, in `timezone` */
  openMinute: number;
  closeMinute: number;
  /** 0 = Sunday … 6 = Saturday */
  openDays: number[];
  afterHoursMessage: string;
  pauseHours: number;
  timezone: string;
  openNow: boolean;
}

export type BotBehaviorInput = Partial<Omit<BotBehavior, "timezone" | "openNow">>;

export const chatbotApi = {
  getBehavior: () => apiClient.get<BotBehavior>("/chatbot/behavior").then((r) => r.data),

  saveBehavior: (data: BotBehaviorInput) => apiClient.put<BotBehavior>("/chatbot/behavior", data).then((r) => r.data),

  listFlows: () =>
    apiClient.get<ChatbotFlow[]>("/chatbot/flows").then((r) => r.data),

  getFlow: (flowId: string) =>
    apiClient.get<ChatbotFlow>(`/chatbot/flows/${flowId}`).then((r) => r.data),

  createFlow: (data: CreateFlowRequest) =>
    apiClient.post<ChatbotFlow>("/chatbot/flows", data).then((r) => r.data),

  updateFlow: (flowId: string, data: UpdateFlowRequest) =>
    apiClient.patch<ChatbotFlow>(`/chatbot/flows/${flowId}`, data).then((r) => r.data),

  saveNodes: (flowId: string, data: SaveNodesRequest) =>
    apiClient.post<ChatbotFlow>(`/chatbot/flows/${flowId}/nodes`, data).then((r) => r.data),

  activateFlow: (flowId: string) =>
    apiClient.post<ChatbotFlow>(`/chatbot/flows/${flowId}/activate`).then((r) => r.data),

  deactivateFlow: (flowId: string) =>
    apiClient.post<ChatbotFlow>(`/chatbot/flows/${flowId}/deactivate`).then((r) => r.data),

  deleteFlow: (flowId: string) =>
    apiClient.delete(`/chatbot/flows/${flowId}`).then((r) => r.data),

  getAnalytics: (flowId: string) =>
    apiClient.get<ChatbotFlowAnalytics>(`/chatbot/flows/${flowId}/analytics`).then((r) => r.data),

  simulateFlow: (flowId: string, data: SimulateFlowRequest) =>
    apiClient
      .post<SimulateFlowResponse>(`/chatbot/flows/${flowId}/simulate`, data)
      .then((r) => r.data),
};
