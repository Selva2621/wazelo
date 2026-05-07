import apiClient from "./client";

export interface WhatsAppSession {
  id: string;
  status: "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";
  phoneNumber: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  userId: string;
  hasCreds?: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

export interface InitiateSessionResponse {
  session: { id: string; status: string; createdAt: string };
  message: string;
}

export const whatsappApi = {
  initiateSession: async (idempotencyKey?: string) => {
    const r = await apiClient.post<InitiateSessionResponse>(
      "/whatsapp/sessions",
      idempotencyKey ? { idempotencyKey } : {},
    );
    return r.data;
  },

  getMySession: async () => {
    const r = await apiClient.get<WhatsAppSession>("/whatsapp/sessions/me");
    return r.data;
  },

  getSession: async (sessionId: string) => {
    const r = await apiClient.get<WhatsAppSession>(
      `/whatsapp/sessions/${sessionId}`,
    );
    return r.data;
  },

  listSessions: async (params?: {
    status?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }) => {
    const r = await apiClient.get<{
      data: WhatsAppSession[];
      total: number;
      page: number;
      limit: number;
    }>("/whatsapp/admin/sessions", { params });
    return { sessions: r.data.data, total: r.data.total, page: r.data.page, limit: r.data.limit };
  },

  disconnect: async (reason?: string, targetUserId?: string) => {
    const r = await apiClient.delete<{ message: string }>(
      targetUserId
        ? `/whatsapp/admin/sessions/${targetUserId}`
        : "/whatsapp/sessions",
      { data: { reason, targetUserId } },
    );
    return r.data;
  },

  refreshQr: async (sessionId: string) => {
    const r = await apiClient.post<{ sessionId: string; message: string }>(
      `/whatsapp/sessions/${sessionId}/refresh-qr`,
    );
    return r.data;
  },

  reconnectSession: async (sessionId: string) => {
    const r = await apiClient.post<{ sessionId: string; message: string }>(
      `/whatsapp/sessions/${sessionId}/reconnect`,
    );
    return r.data;
  },

  sendMessage: async (data: {
    recipientPhone: string;
    type: string;
    body?: string;
    mediaUrl?: string;
  }) => {
    const r = await apiClient.post("/whatsapp/messages", data);
    return r.data;
  },
};
