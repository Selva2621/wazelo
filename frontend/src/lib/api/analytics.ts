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
  LiveChannelStatsResponse,
  LiveWaitingResponse,
  LiveRevenueResponse,
  LiveLeadsResponse,
  CityInsightsResponse,
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

  // ─── Live: messages today per channel (Message City) ───

  getLiveChannels: (params?: { timezoneOffsetMinutes?: number }) =>
    apiClient
      .get<LiveChannelStatsResponse>("/analytics/live/channels", { params })
      .then((r) => r.data),

  // ─── Live dashboard ───

  getWaiting: (params?: { minMinutes?: number }) =>
    apiClient
      .get<LiveWaitingResponse>("/analytics/live/waiting", { params })
      .then((r) => r.data),

  getRevenue: () =>
    apiClient.get<LiveRevenueResponse>("/analytics/live/revenue").then((r) => r.data),

  getLeadsToday: (params?: { timezoneOffsetMinutes?: number }) =>
    apiClient
      .get<LiveLeadsResponse>("/analytics/live/leads", { params })
      .then((r) => r.data),

  getCityInsights: (params?: { timezoneOffsetMinutes?: number }) =>
    apiClient
      .get<CityInsightsResponse>("/analytics/live/city-insights", { params })
      .then((r) => r.data),

  // ─── Backfill ───

  triggerBackfill: (data: BackfillRequest) =>
    apiClient
      .post<BackfillResponse>("/analytics/backfill", data)
      .then((r) => r.data),
};
