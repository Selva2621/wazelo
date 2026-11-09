import apiClient from "./client";
import type {
  LeadAdEntry,
  LeadAdListResponse,
  LeadAdListParams,
  LeadAdAnalytics,
  LeadAdAnalyticsParams,
  LeadAdConfigStatus,
  SaveLeadAdsConfigPayload,
} from "@/lib/types/lead-ads";

export interface SimulateLeadPayload {
  name: string;
  phone: string;
  email?: string;
  platform?: "facebook" | "instagram";
  formId?: string;
  campaignName?: string;
  fields?: Record<string, string>;
}

/** A Page + form that has sent leads (for picking them in Lead Ad Received rules) */
export interface LeadAdForm {
  pageId: string;
  pageName: string | null;
  formId: string;
  platform: string;
  campaignName: string | null;
  leads: number;
  lastLeadAt: string | null;
}

export const leadAdsApi = {
  listForms: () => apiClient.get<LeadAdForm[]>("/lead-ads/forms").then((r) => r.data),

  listEntries: (params?: LeadAdListParams) =>
    apiClient
      .get<LeadAdListResponse>("/lead-ads/entries", { params })
      .then((r) => r.data),

  getEntry: (id: string) =>
    apiClient.get<LeadAdEntry>(`/lead-ads/entries/${id}`).then((r) => r.data),

  retryEntry: (id: string) =>
    apiClient.post(`/lead-ads/entries/${id}/retry`).then((r) => r.data),

  /** Dev only (the backend answers 404 in production) */
  simulateLead: (payload: SimulateLeadPayload) =>
    apiClient.post<LeadAdEntry>("/lead-ads/dev/simulate", payload).then((r) => r.data),

  getAnalytics: (params?: LeadAdAnalyticsParams) =>
    apiClient
      .get<LeadAdAnalytics>("/lead-ads/analytics", { params })
      .then((r) => r.data),

  getConfig: () =>
    apiClient.get<LeadAdConfigStatus>("/lead-ads/config").then((r) => r.data),

  saveConfig: (payload: SaveLeadAdsConfigPayload) =>
    apiClient.put("/lead-ads/config", payload).then((r) => r.data),
};
