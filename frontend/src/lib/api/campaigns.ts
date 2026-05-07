import apiClient from "./client";
import type {
  Campaign,
  CampaignListResponse,
  CampaignAnalytics,
  RecipientListResponse,
  AudiencePreview,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ScheduleCampaignRequest,
  ListCampaignsParams,
  ListRecipientsParams,
} from "@/lib/types/campaigns";

export const campaignsApi = {
  // ─── CRUD ───

  create: (data: CreateCampaignRequest) =>
    apiClient.post<{ campaign: Campaign; deduplicated: boolean }>("/campaigns", data).then((r) => r.data),

  list: (params?: ListCampaignsParams) =>
    apiClient
      .get<CampaignListResponse>("/campaigns", { params })
      .then((r) => r.data),

  get: (campaignId: string) =>
    apiClient.get<Campaign>(`/campaigns/${campaignId}`).then((r) => r.data),

  update: (campaignId: string, data: UpdateCampaignRequest) =>
    apiClient
      .patch<Campaign>(`/campaigns/${campaignId}`, data)
      .then((r) => r.data),

  // ─── Campaign Actions ───

  execute: (campaignId: string) =>
    apiClient
      .post<Campaign>(`/campaigns/${campaignId}/execute`)
      .then((r) => r.data),

  schedule: (campaignId: string, data: ScheduleCampaignRequest) =>
    apiClient
      .post<Campaign>(`/campaigns/${campaignId}/schedule`, data)
      .then((r) => r.data),

  pause: (campaignId: string) =>
    apiClient
      .post<Campaign>(`/campaigns/${campaignId}/pause`)
      .then((r) => r.data),

  resume: (campaignId: string) =>
    apiClient
      .post<Campaign>(`/campaigns/${campaignId}/resume`)
      .then((r) => r.data),

  cancel: (campaignId: string) =>
    apiClient
      .post<Campaign>(`/campaigns/${campaignId}/cancel`)
      .then((r) => r.data),

  // ─── Recipients ───

  listRecipients: (campaignId: string, params?: ListRecipientsParams) =>
    apiClient
      .get<RecipientListResponse>(`/campaigns/${campaignId}/recipients`, {
        params,
      })
      .then((r) => r.data),

  // ─── Analytics ───

  getAnalytics: (campaignId: string) =>
    apiClient
      .get<CampaignAnalytics>(`/campaigns/${campaignId}/analytics`)
      .then((r) => r.data),

  // ─── Audience Preview ───

  previewAudience: (data: {
    audienceType: string;
    audienceFilters?: Record<string, unknown>;
  }) =>
    apiClient
      .post<AudiencePreview>("/campaigns/preview-audience", data)
      .then((r) => r.data),
};
