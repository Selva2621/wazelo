// ─── Plan ───

export type BillingCycle = "MONTHLY" | "YEARLY";
export type SubscriptionStatus =
  | "ACTIVE"
  | "TRIAL"
  | "EXPIRED"
  | "CANCELLED"
  | "PAST_DUE"
  | "GRACE_PERIOD";
export type PaymentStatus = "PENDING" | "PROCESSING" | "SUCCEEDED" | "FAILED" | "REFUNDED";
export type InvoiceStatus = "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description?: string;
  billingCycle: BillingCycle;
  priceInCents: number;
  currency: string;
  version: number;
  isActive: boolean;
  isDefault: boolean;
  trialDays: number;
  sortOrder: number;
  // Limits
  maxUsers: number;
  maxWhatsappSessions: number;
  maxMessagesPerMonth: number;
  maxCampaignsPerMonth: number;
  // Feature flags
  campaignsEnabled: boolean;
  automationEnabled: boolean;
  apiEnabled: boolean;
  // API Limits
  maxApiCallsPerMonth: number;
  // AI Credits
  aiCreditsPerMonth: number;
  aiEnabled: boolean;
  // Message Templates
  maxMessageTemplates: number;
  // Shopify
  shopifyEnabled: boolean;
  maxShopifyStores: number;
  // Trial limits (null = use plan limit)
  trialMaxUsers?: number | null;
  trialMaxWhatsappSessions?: number | null;
  trialMaxMessagesPerMonth?: number | null;
  trialMaxCampaignsPerMonth?: number | null;
  // Thresholds
  softLimitPercent: number;
  gracePeriodDays: number;
  createdAt: string;
}

// Convenience helpers for display
export function formatPlanPrice(plan: Plan): string {
  const dollars = (plan.priceInCents / 100).toFixed(2);
  return `$${dollars}`;
}

export function getPlanLimits(plan: Plan) {
  return {
    maxUsers: plan.maxUsers,
    maxSessions: plan.maxWhatsappSessions,
    maxMessagesPerMonth: plan.maxMessagesPerMonth,
    maxCampaignsPerMonth: plan.maxCampaignsPerMonth,
  };
}

export interface PlanFeature {
  label: string;
  enabled: boolean;
}

export function getPlanFeatures(plan: Plan): PlanFeature[] {
  return [
    { label: "Campaigns",            enabled: plan.campaignsEnabled },
    { label: "Automation",           enabled: plan.automationEnabled },
    { label: "API Access",           enabled: plan.apiEnabled },
    { label: "AI Features",          enabled: plan.aiEnabled },
    { label: "Shopify Integration",  enabled: plan.shopifyEnabled },
  ];
}

// ─── Subscription ───

export interface SubscriptionPlanSummary {
  id: string;
  name: string;
  slug: string;
  billingCycle: BillingCycle;
  priceInCents: number;
  currency: string;
  campaignsEnabled: boolean;
  automationEnabled: boolean;
  apiEnabled: boolean;
  maxUsers: number;
  maxWhatsappSessions: number;
  maxMessagesPerMonth: number;
  maxCampaignsPerMonth: number;
  maxApiCallsPerMonth: number;
  aiCreditsPerMonth: number;
  aiEnabled: boolean;
  maxMessageTemplates: number;
  shopifyEnabled: boolean;
  maxShopifyStores: number;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  plan: SubscriptionPlanSummary;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  cancelledAt?: string | null;
  scheduledPlanId?: string | null;
  scheduledChangeAt?: string | null;
}

// ─── Usage ───

export interface UsageEntry {
  current: number;
  limit: number;
  percentUsed: number;
}

export interface UsageMetrics {
  messagesSent: UsageEntry;
  campaignExecutions: UsageEntry;
  activeUsers: UsageEntry;
  whatsappSessions: UsageEntry;
  apiCalls: UsageEntry;
  aiCredits: UsageEntry;
  messageTemplates: UsageEntry;
}

export interface SubscriptionWithUsage {
  subscription: Subscription | null;
  usage: UsageMetrics | null;
}

// ─── Change Plan Response ───

export interface ChangePlanResponse {
  subscription: Subscription;
  type: "upgrade" | "downgrade";
  effectiveImmediately: boolean;
  proration?: {
    creditAmountInCents: number;
    chargeAmountInCents: number;
    netAmountInCents: number;
    daysRemainingInPeriod: number;
    totalDaysInPeriod: number;
  };
  scheduledAt?: string;
  deduplicated: boolean;
}

// ─── Payment / Invoice ───

export interface Payment {
  id: string;
  orgId: string;
  subscriptionId: string;
  amountInCents: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod?: string;
  failedReason?: string;
  retryCount: number;
  paidAt?: string;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orgId: string;
  subscriptionId: string;
  invoiceNumber: string;
  amountInCents: number;
  currency: string;
  status: InvoiceStatus;
  periodStart: string;
  periodEnd: string;
  lineItems: { description: string; amount: number; quantity: number }[];
  pdfUrl?: string;
  dueDate: string;
  paidAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListPaymentsParams {
  page?: number;
  limit?: number;
  status?: PaymentStatus;
}

export interface ListInvoicesParams {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
}
