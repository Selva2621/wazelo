export interface CsatSurvey {
  id: string;
  orgId: string;
  conversationId: string;
  contactPhone: string;
  agentId: string;
  rating: number | null;
  comment: string | null;
  sentAt: string;
  respondedAt: string | null;
  channelType: string | null;
  createdAt: string;
}

export interface CsatStats {
  avgRating: number;
  totalResponses: number;
  byAgent: { agentId: string; _avg: { rating: number }; _count: { rating: number } }[];
  distribution: { rating: number | null; count: number }[];
}

export interface CsatListResponse {
  data: CsatSurvey[];
  total: number;
}

export interface CsatStatsParams {
  startDate?: string;
  endDate?: string;
}
