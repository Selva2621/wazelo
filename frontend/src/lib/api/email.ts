import apiClient from "./client";

export type EmailProvider = "GMAIL" | "OUTLOOK" | "ZOHO" | "CUSTOM";

/** The workspace's business email (the password is never sent back) */
export interface EmailAccount {
  provider: EmailProvider;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromAddress: string;
  replyTo: string | null;
  /** UNVERIFIED | ACTIVE | ERROR */
  status: "UNVERIFIED" | "ACTIVE" | "ERROR";
  lastError: string | null;
  verifiedAt: string | null;
  dailyLimit: number;
  sentToday: number;
}

export interface SaveEmailAccountInput {
  provider: EmailProvider;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  /** Leave out when updating to keep the saved one */
  password?: string;
  fromName: string;
  fromAddress: string;
  replyTo?: string;
  dailyLimit?: number;
}

export interface EmailLogRow {
  id: string;
  toAddress: string;
  subject: string;
  status: "QUEUED" | "SENT" | "FAILED" | "SKIPPED";
  error: string | null;
  source: "CAMPAIGN" | "AUTOMATION" | "SEQUENCE" | "TEST";
  sentAt: string | null;
  createdAt: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export const emailApi = {
  getAccount: async (): Promise<EmailAccount | null> => (await apiClient.get("/email/account")).data || null,
  saveAccount: async (input: SaveEmailAccountInput): Promise<EmailAccount> => (await apiClient.put("/email/account", input)).data,
  sendTest: async (to?: string): Promise<{ sentTo: string }> => (await apiClient.post("/email/account/test", to ? { to } : {})).data,
  disconnect: async (): Promise<void> => {
    await apiClient.delete("/email/account");
  },
  recent: async (): Promise<EmailLogRow[]> => (await apiClient.get("/email/messages")).data,

  listTemplates: async (): Promise<EmailTemplate[]> => (await apiClient.get("/email/templates")).data,
  createTemplate: async (t: Pick<EmailTemplate, "name" | "subject" | "body">): Promise<EmailTemplate> =>
    (await apiClient.post("/email/templates", t)).data,
  updateTemplate: async (id: string, t: Pick<EmailTemplate, "name" | "subject" | "body">): Promise<EmailTemplate> =>
    (await apiClient.put(`/email/templates/${id}`, t)).data,
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/email/templates/${id}`);
  },
  /** Write with AI: a subject + message from a short request (uses AI credits) */
  generateEmailTemplate: async (prompt: string): Promise<{ subject: string; body: string }> =>
    (await apiClient.post("/email/templates/generate", { prompt })).data,
};
