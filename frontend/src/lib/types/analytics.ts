// ─── Query Params ───

export type AnalyticsPeriod = "day" | "week" | "month" | "custom";

export interface AnalyticsQueryParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
  userId?: string;
  timezoneOffsetHours?: number;
}

export interface BackfillRequest {
  startDate: string;
  endDate?: string;
}

export interface BackfillResponse {
  message: string;
  jobsCreated: number;
}

// ─── Message Volume ───

export interface MessageVolumeSeries {
  date: string;
  inbound: number;
  outbound: number;
  total: number;
}

export interface MessageVolumeTotals {
  inbound: number;
  outbound: number;
  total: number;
  sent: number;
  delivered: number;
  read: number;
  failed: number;
}

export interface MessageVolumeResponse {
  series: MessageVolumeSeries[];
  totals: MessageVolumeTotals;
}

// ─── Response Time ───

export interface ResponseTimeSeries {
  date: string;
  avgResponseTimeMs: number;
  p50ResponseTimeMs: number | null;
  p95ResponseTimeMs: number | null;
  responseCount: number;
}

export interface ResponseTimeOverall {
  avgResponseTimeMs: number | null;
  minResponseTimeMs: number | null;
  maxResponseTimeMs: number | null;
  totalResponses: number;
}

export interface ResponseTimeResponse {
  series: ResponseTimeSeries[];
  overall: ResponseTimeOverall;
}

// ─── Conversion Funnel ───

export interface ConversionSnapshot {
  new: number;
  contacted: number;
  interested: number;
  converted: number;
  closed: number;
  total: number;
}

export interface ConversionRates {
  contactedRate: number;
  interestedRate: number;
  conversionRate: number;
  closedRate: number;
}

export interface ConversionTransition {
  from: string;
  to: string;
  count: number;
}

export interface ConversionFunnelResponse {
  snapshot: ConversionSnapshot;
  rates: ConversionRates;
  transitions: ConversionTransition[];
}

// ─── Peak Hours ───

export interface PeakHourEntry {
  hour: number;
  inbound: number;
  outbound: number;
  total: number;
}

export interface PeakHoursResponse {
  hours: PeakHourEntry[];
  peakHour: number;
  quietHour: number;
}

// ─── Team Performance ───

export interface TeamUserPerformance {
  userId: string;
  firstName: string;
  lastName: string;
  messagesSent: number;
  messagesReceived: number;
  avgResponseTimeMs: number | null;
  contactsConverted: number;
  activeConversations: number;
}

export interface TeamPerformanceResponse {
  users: TeamUserPerformance[];
}

// ─── Campaign Summary ───

export interface CampaignSummarySeries {
  date: string;
  campaigns: number;
  recipients: number;
  sent: number;
  delivered: number;
  failed: number;
  read: number;
}

export interface CampaignSummaryTotals {
  totalCampaigns: number;
  completedCampaigns: number;
  totalRecipients: number;
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalRead: number;
  avgDeliveryRate: number;
  avgReadRate: number;
}

export interface CampaignSummaryResponse {
  series: CampaignSummarySeries[];
  totals: CampaignSummaryTotals;
}

// ─── Dashboard Overview (combined) ───

export interface DashboardOverviewResponse {
  messageVolume: MessageVolumeResponse;
  responseTime: ResponseTimeResponse;
  conversionFunnel: ConversionFunnelResponse;
  peakHours: PeakHoursResponse;
  campaignSummary: CampaignSummaryResponse;
}

// ─── Live channels (Message City) ───

export type LiveChannelKey =
  | "WHATSAPP"
  | "INSTAGRAM"
  | "FACEBOOK_MESSENGER"
  | "WEBSITE"
  | "EMAIL";

export interface LiveChannelStat {
  key: LiveChannelKey;
  inbound: number;
  outbound: number;
  delivered: number;
  read: number;
  failed: number;
  lastMessageAt: string | null;
}

export interface LiveChannelStatsResponse {
  asOf: string;
  since: string;
  channels: LiveChannelStat[];
  openConversations: number;
  unread: number;
}

// ─── Live dashboard: waiting chats, money strip, leads today ───

export interface LiveWaitingResponse {
  minMinutes: number;
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

// ─── Message City insights ───

export interface CityHourBucket {
  in: number;
  out: number;
}

export interface CityChannelInsight {
  key: LiveChannelKey;
  today: CityHourBucket[];
  yesterday: CityHourBucket[];
  /** Average minutes to first reply today; null when nothing was answered */
  replyMinutes: number | null;
  replies: number;
}

export interface CityInsightsResponse {
  currentHour: number;
  channels: CityChannelInsight[];
  totalToday: number;
  totalYesterdaySameTime: number;
  replyMinutes: number | null;
}
