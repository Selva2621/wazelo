import type { LiveChannelStat } from '../../domain/services/live-channel-stats';

export interface MessageVolumeResponse {
  series: {
    date: string;
    inbound: number;
    outbound: number;
    total: number;
  }[];
  totals: {
    inbound: number;
    outbound: number;
    total: number;
    sent: number;
    delivered: number;
    read: number;
    failed: number;
  };
}

export interface ResponseTimeResponse {
  series: {
    date: string;
    avgResponseTimeMs: number;
    p50ResponseTimeMs: number | null;
    p95ResponseTimeMs: number | null;
    responseCount: number;
  }[];
  overall: {
    avgResponseTimeMs: number | null;
    minResponseTimeMs: number | null;
    maxResponseTimeMs: number | null;
    totalResponses: number;
  };
}

export interface ConversionFunnelResponse {
  snapshot: {
    new: number;
    contacted: number;
    interested: number;
    converted: number;
    closed: number;
    total: number;
  };
  rates: {
    contactedRate: number;
    interestedRate: number;
    conversionRate: number;
    closedRate: number;
  };
  transitions: {
    from: string;
    to: string;
    count: number;
  }[];
}

export interface PeakHoursResponse {
  hours: {
    hour: number;
    inbound: number;
    outbound: number;
    total: number;
  }[];
  peakHour: number;
  quietHour: number;
}

export interface TeamPerformanceResponse {
  users: {
    userId: string;
    firstName: string;
    lastName: string;
    messagesSent: number;
    messagesReceived: number;
    avgResponseTimeMs: number | null;
    contactsConverted: number;
    activeConversations: number;
  }[];
}

export interface CampaignSummaryResponse {
  series: {
    date: string;
    campaigns: number;
    recipients: number;
    sent: number;
    delivered: number;
    failed: number;
    read: number;
  }[];
  totals: {
    totalCampaigns: number;
    completedCampaigns: number;
    totalRecipients: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    totalRead: number;
    avgDeliveryRate: number;
    avgReadRate: number;
  };
}

export interface LiveChannelStatsResponse {
  asOf: string;
  /** Start of the requester's local day (UTC instant) */
  since: string;
  channels: LiveChannelStat[];
  openConversations: number;
  unread: number;
}

export interface LiveWaitingResponse {
  minMinutes: number;
  /** All chats waiting that long (the list shows the oldest few) */
  total: number;
  items: {
    conversationId: string;
    contactId: string | null;
    name: string | null;
    phone: string;
    channelType: string;
    waitingMinutes: number;
    assignee: { id: string; name: string } | null;
  }[];
}

export interface LiveRevenueResponse {
  /** Start of the 7-day window for "won" and "proposals" */
  since: string;
  currency: string;
  mixedCurrencies: boolean;
  pipelineValue: number;
  openDeals: number;
  wonCount: number;
  wonValue: number;
  proposalsSent: number;
  proposalsViewed: number;
}

export interface LiveLeadsResponse {
  since: string;
  total: number;
  items: { id: string; name: string | null; phone: string; origin: string; createdAt: string }[];
}

export interface DashboardOverviewResponse {
  messageVolume: MessageVolumeResponse;
  responseTime: ResponseTimeResponse;
  conversionFunnel: ConversionFunnelResponse;
  peakHours: PeakHoursResponse;
  campaignSummary: CampaignSummaryResponse;
}
