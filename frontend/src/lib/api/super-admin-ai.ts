import superAdminClient from "./super-admin-client";

export type AiValueSource = "settings" | "env";

export interface SAAiCreditPack {
  id: string;
  name: string;
  credits: number;
  /** Minor units */
  priceInCents: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

export interface SAAiSettings {
  provider: string;
  model: string;
  apiKeySet: boolean;
  source: { provider: AiValueSource; model: AiValueSource; apiKey: AiValueSource | "none" };
  providers: string[];
  actions: { action: string; label: string; defaultCost: number; cost: number }[];
  packs: SAAiCreditPack[];
}

export interface UpdateAiSettingsBody {
  provider?: string;
  model?: string;
  /** '' keeps the saved key, null clears it */
  apiKey?: string | null;
  actionCosts?: Record<string, number>;
}

export interface AiUsageStats {
  calls: number;
  credits: number;
  byAction: { action: string; calls: number; credits: number }[];
  topOrgs: { orgId: string; orgName: string; credits: number }[];
}

export interface AiTestResult {
  ok: boolean;
  latencyMs?: number;
  reply?: string;
  error?: string;
}

export interface SAAiCreditPackDetail {
  pack: SAAiCreditPack & { createdAt: string; updatedAt: string };
  sales: {
    purchases: number;
    creditsSold: number;
    /** Minor units, from the recorded successful payments */
    revenueInCents: number;
    buyers: number;
    recent: { id: string; orgId: string; orgName: string; credits: number; createdAt: string }[];
  };
}

export type AiCreditPackBody = Omit<SAAiCreditPack, "id" | "isActive" | "sortOrder"> & { sortOrder?: number };

// Responses are wrapped by the TransformInterceptor: { success, data }
export const superAdminAiApi = {
  get: () => superAdminClient.get<{ data: SAAiSettings }>("/super-admin/ai").then((r) => r.data.data),

  update: (body: UpdateAiSettingsBody) =>
    superAdminClient.patch<{ data: SAAiSettings }>("/super-admin/ai", body).then((r) => r.data.data),

  test: (body: { provider: string; model: string; apiKey?: string }) =>
    superAdminClient.post<{ data: AiTestResult }>("/super-admin/ai/test", body).then((r) => r.data.data),

  /** POST so a typed key stays out of the URL. Without `apiKey` the stored key is used for the saved provider. */
  models: (provider: string, apiKey?: string) =>
    superAdminClient
      .post<{ data: { models: string[]; error?: string } }>("/super-admin/ai/models", {
        provider,
        ...(apiKey ? { apiKey } : {}),
      })
      .then((r) => r.data.data),

  usage: () =>
    superAdminClient
      .get<{ data: { today: AiUsageStats; last30Days: AiUsageStats } }>("/super-admin/ai/usage")
      .then((r) => r.data.data),

  getPack: (id: string) =>
    superAdminClient.get<{ data: SAAiCreditPackDetail }>(`/super-admin/ai/packs/${id}`).then((r) => r.data.data),

  createPack: (body: AiCreditPackBody) =>
    superAdminClient.post<{ data: SAAiCreditPack }>("/super-admin/ai/packs", body).then((r) => r.data.data),

  updatePack: (id: string, body: Partial<Omit<SAAiCreditPack, "id" | "currency">>) =>
    superAdminClient.patch<{ data: SAAiCreditPack }>(`/super-admin/ai/packs/${id}`, body).then((r) => r.data.data),
};
