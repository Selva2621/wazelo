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

export const leadAdsApi = {
  listEntries: (params?: LeadAdListParams) =>
    apiClient
      .get<LeadAdListResponse>("/lead-ads/entries", { params })
      .then((r) => r.data),

  getEntry: (id: string) =>
    apiClient.get<LeadAdEntry>(`/lead-ads/entries/${id}`).then((r) => r.data),

  retryEntry: (id: string) =>
    apiClient.post(`/lead-ads/entries/${id}/retry`).then((r) => r.data),

  getAnalytics: (params?: LeadAdAnalyticsParams) =>
    apiClient
      .get<LeadAdAnalytics>("/lead-ads/analytics", { params })
      .then((r) => r.data),

  getConfig: () =>
    apiClient.get<LeadAdConfigStatus>("/lead-ads/config").then((r) => r.data),

  saveConfig: (payload: SaveLeadAdsConfigPayload) =>
    apiClient.put("/lead-ads/config", payload).then((r) => r.data),
};
