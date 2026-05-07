import apiClient from "./client";
import type {
  AnalyticsQueryParams,
  BackfillRequest,
  BackfillResponse,
  DashboardOverviewResponse,
  MessageVolumeResponse,
  ResponseTimeResponse,
  ConversionFunnelResponse,
  PeakHoursResponse,
  TeamPerformanceResponse,
  CampaignSummaryResponse,
} from "@/lib/types/analytics";

export const analyticsApi = {
  // ─── Combined Dashboard ───

  getDashboard: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<DashboardOverviewResponse>("/analytics/dashboard", { params })
      .then((r) => r.data),

  // ─── Individual Endpoints ───

  getMessages: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<MessageVolumeResponse>("/analytics/messages", { params })
      .then((r) => r.data),

  getResponseTime: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<ResponseTimeResponse>("/analytics/response-time", { params })
      .then((r) => r.data),

  getConversionFunnel: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<ConversionFunnelResponse>("/analytics/conversion-funnel", { params })
      .then((r) => r.data),

  getPeakHours: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<PeakHoursResponse>("/analytics/peak-hours", { params })
      .then((r) => r.data),

  getTeamPerformance: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<TeamPerformanceResponse>("/analytics/team-performance", { params })
      .then((r) => r.data),

  getCampaigns: (params?: AnalyticsQueryParams) =>
    apiClient
      .get<CampaignSummaryResponse>("/analytics/campaigns", { params })
      .then((r) => r.data),

  // ─── Backfill ───

  triggerBackfill: (data: BackfillRequest) =>
    apiClient
      .post<BackfillResponse>("/analytics/backfill", data)
      .then((r) => r.data),
};
