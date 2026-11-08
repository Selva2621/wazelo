import apiClient from "./client";

export interface WhatsAppSession {
  id: string;
  status: "CONNECTING" | "CONNECTED" | "DISCONNECTED" | "RECONNECTING";
  phoneNumber: string | null;
  lastActiveAt: string | null;
  createdAt: string;
  userId: string;
  hasCreds?: boolean;
  /** Why the number stopped: NETWORK | LOGGED_OUT | BANNED | REPLACED | BAD_SESSION */
  disconnectReason?: string | null;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
  };
}

/** Send-safety snapshot for the user's own WhatsApp number */
/** Per-number limits an admin can set. Empty = no daily cap (plan limit only). */
export interface SendingLimits {
  warmupEnabled?: boolean;
  warmupStage?: number;
  dailyBulkCap?: number;
  dailyColdCap?: number;
  bulkGapMinMs?: number;
  bulkGapMaxMs?: number;
}

export interface SendHealth {
  sessionId: string;
  /** Caps are null when the number has no daily cap */
  warmup: { stage: number; linkedDays: number; coldCap: number | null; bulkCap: number | null; customized?: boolean };
  today: { bulkSent: number; coldSent: number };
  /** Older backends omit the fields below */
  remaining?: { bulk: number | null; cold: number | null };
  resetsAt?: string;
  limits?: SendingLimits;
  limitMode?: "plan" | "warmup" | "custom";
  bulkGapMs?: { min: number; max: number };
  /** Org plan messages this billing period; limit null = unlimited */
  plan?: { used: number; limit: number | null; remaining: number | null };
  delivery: { sampled: number; delivered: number; rate: number | null };
  optOuts24h: number;
  withinSendingHours: boolean;
  sendingHours: { start: number; end: number; timeZone: string };
  /** Campaign sending window (campaign's time zone); older backends omit it */
  campaignHours?: { start: number; end: number };
  paused: { until: string; reason: string | null } | null;
  risk: "ok" | "warning" | "paused";
}

export interface InitiateSessionResponse {
  session: { id: string; status: string; createdAt: string };
  message: string;
}

export interface PairingCodeResponse extends InitiateSessionResponse {
  /** 8 characters, entered in WhatsApp → Linked devices → Link with phone number */
  pairingCode: string;
  phoneNumber: string;
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

  getMySendHealth: async () => {
    const r = await apiClient.get<SendHealth | null>("/whatsapp/sessions/me/health");
    return r.data;
  },

  /** Admin only. Send {} to clear every override. */
  updateMySendingLimits: async (limits: SendingLimits) => {
    const r = await apiClient.put<SendHealth>("/whatsapp/sessions/me/sending-limits", limits);
    return r.data;
  },

  resumeMySending: async () => {
    const r = await apiClient.post<SendHealth | null>("/whatsapp/sessions/me/resume-sending");
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
    const r = await apiClient.post<{ sessionId: string; message: string; linking?: boolean }>(
      `/whatsapp/sessions/${sessionId}/refresh-qr`,
    );
    return r.data;
  },

  requestPairingCode: async (phoneNumber: string) => {
    const r = await apiClient.post<PairingCodeResponse>(
      "/whatsapp/sessions/pairing-code",
      { phoneNumber },
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
