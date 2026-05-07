// ─── Social Ads Lead Integration Types ─────

export type LeadAdPlatform = "facebook" | "instagram" | "whatsapp";
export type LeadAdStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

export interface LeadAdEntry {
  id: string;
  orgId: string;
  leadgenId: string;
  pageId: string;
  formId: string | null;
  adId: string | null;
  adName: string | null;
  campaignId: string | null;
  campaignName: string | null;
  platform: LeadAdPlatform;
  leadData: Record<string, unknown>;
  contactId: string | null;
  status: LeadAdStatus;
  errorMessage: string | null;
  processedAt: string | null;
  channelId: string | null;
  retryCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LeadAdListResponse {
  data: LeadAdEntry[];
  total: number;
  take: number;
  skip: number;
}

export interface LeadAdListParams {
  take?: number;
  skip?: number;
  platform?: LeadAdPlatform;
  status?: LeadAdStatus;
  startDate?: string;
  endDate?: string;
  campaignName?: string;
  search?: string;
}

export interface LeadAdAnalytics {
  totalLeads: number;
  byPlatform: { platform: string; count: number }[];
  byCampaign: { campaignName: string; count: number }[];
  byDay: { date: string; count: number }[];
  conversionRate: number;
}

export interface LeadAdAnalyticsParams {
  startDate?: string;
  endDate?: string;
  platform?: LeadAdPlatform;
}

export interface LeadAdConfigStatus {
  configured: boolean;
  subscribedPages: {
    pageId: string;
    pageName: string;
    channelId: string;
    channelType: string;
  }[];
  webhookUrl: string;
  hasAppSecret: boolean;
  hasVerifyToken: boolean;
  isFullyConfigured: boolean;
}

export interface SaveLeadAdsConfigPayload {
  metaAppSecret?: string;
  webhookVerifyToken?: string;
}

// ─── WebSocket payloads ─────

export interface WsLeadAdReceivedPayload {
  leadAdEntryId: string;
  contactId: string;
  contactName: string | null;
  contactPhone: string;
  platform: LeadAdPlatform;
  campaignName: string | null;
  adName: string | null;
}

export interface WsLeadAdFailedPayload {
  leadAdEntryId: string;
  leadgenId: string;
  error: string;
  retryCount: number;
}

// ─── Display labels ─────

export const LEAD_AD_PLATFORM_LABELS: Record<LeadAdPlatform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
};

export const LEAD_AD_STATUS_LABELS: Record<LeadAdStatus, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
};
