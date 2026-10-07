import superAdminClient from "./super-admin-client";
import type { SuperAdminInfo } from "@/stores/super-admin-auth-store";

// All responses are wrapped by NestJS TransformInterceptor: { success, data, timestamp }
// So actual payload is always at r.data.data

export interface SuperAdminSession {
  accessToken: string;
  expiresIn: number;
  superAdmin: SuperAdminInfo;
}

export type SuperAdminLoginResponse =
  | ({ requiresTwoFactor: false } & SuperAdminSession)
  | { requiresTwoFactor: true; challengeToken: string };

export interface CurrencyRevenue {
  currency: string;
  mrrCents: number;
  arrCents: number;
  payingSubscriptions: number;
}

export interface PlatformStats {
  totalOrgs: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  expiredSubscriptions: number;
  /** One entry per currency, largest MRR first */
  revenue: CurrencyRevenue[];
  newOrgsLast30Days: number;
  churnedLast30Days: number;
  openTickets: number;
}

export interface PlatformActivityItem {
  id: string;
  type: "ORG_SIGNUP" | "SUBSCRIPTION" | "TICKET";
  status?: string;
  text: string;
  orgId: string | null;
  at: string;
}

export interface PlatformAuditEntry {
  id: string;
  actorType: "SUPER_ADMIN" | "SYSTEM";
  actorId: string | null;
  actorEmail: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  orgId: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AuditLogQuery {
  page?: number;
  limit?: number;
  action?: string;
  orgId?: string;
  from?: string;
  to?: string;
}

export interface GrowthPoint {
  month: string;
  newOrgs: number;
  newPaying: number;
  churned: number;
  /** Collected payments per currency, minor units */
  revenue: Record<string, number>;
}

export interface BillingListQuery {
  page?: number;
  limit?: number;
  status?: string;
  orgId?: string;
}

export interface TwoFactorSetup {
  secret: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}

export const superAdminApi = {
  login: (email: string, password: string) =>
    superAdminClient
      .post<{ data: SuperAdminLoginResponse }>("/super-admin/auth/login", { email, password })
      .then((r) => r.data.data),

  loginTwoFactor: (challengeToken: string, code: string) =>
    superAdminClient
      .post<{ data: SuperAdminSession }>("/super-admin/auth/login/2fa", { challengeToken, code })
      .then((r) => r.data.data),

  /** Revokes every session for this account and clears the refresh cookie. */
  logout: () => superAdminClient.post("/super-admin/auth/logout").then(() => undefined),

  me: () =>
    superAdminClient.get<{ data: SuperAdminInfo }>("/super-admin/auth/me").then((r) => r.data.data),

  setupTwoFactor: () =>
    superAdminClient.post<{ data: TwoFactorSetup }>("/super-admin/auth/2fa/setup").then((r) => r.data.data),

  enableTwoFactor: (code: string) =>
    superAdminClient
      .post<{ data: SuperAdminInfo }>("/super-admin/auth/2fa/enable", { code })
      .then((r) => r.data.data),

  disableTwoFactor: (code: string) =>
    superAdminClient
      .post<{ data: SuperAdminInfo }>("/super-admin/auth/2fa/disable", { code })
      .then((r) => r.data.data),

  getStats: () =>
    superAdminClient.get<{ data: PlatformStats }>("/super-admin/stats").then((r) => r.data.data),

  listAuditLogs: (params: AuditLogQuery) =>
    superAdminClient
      .get<{ data: { items: PlatformAuditEntry[]; total: number; page: number; totalPages: number } }>(
        "/super-admin/audit-logs",
        { params },
      )
      .then((r) => r.data.data),

  listAnnouncements: () =>
    superAdminClient.get<any>("/super-admin/announcements").then((r) => r.data.data.announcements as any[]),

  createAnnouncement: (data: Record<string, unknown>) =>
    superAdminClient.post<any>("/super-admin/announcements", data).then((r) => r.data.data),

  archiveAnnouncement: (id: string) =>
    superAdminClient.post<any>(`/super-admin/announcements/${id}/archive`).then((r) => r.data.data),

  getGrowth: (months = 12) =>
    superAdminClient
      .get<{ data: { months: GrowthPoint[] } }>("/super-admin/analytics/growth", { params: { months } })
      .then((r) => r.data.data.months),

  listPayments: (params: BillingListQuery) =>
    superAdminClient.get<any>("/super-admin/payments", { params }).then((r) => r.data.data),

  listInvoices: (params: BillingListQuery) =>
    superAdminClient.get<any>("/super-admin/invoices", { params }).then((r) => r.data.data),

  getActivity: (limit = 10) =>
    superAdminClient
      .get<{ data: { items: PlatformActivityItem[] } }>("/super-admin/activity", { params: { limit } })
      .then((r) => r.data.data.items),

  listOrgs: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    superAdminClient.get<any>("/super-admin/organizations", { params }).then((r) => r.data.data),

  getOrg: (id: string) =>
    superAdminClient.get<any>(`/super-admin/organizations/${id}`).then((r) => r.data.data),

  getOrgEntitlements: (id: string) =>
    superAdminClient.get<any>(`/super-admin/organizations/${id}/entitlements`).then((r) => r.data.data),

  setOrgEntitlement: (id: string, data: Record<string, unknown>) =>
    superAdminClient.put<any>(`/super-admin/organizations/${id}/entitlements`, data).then((r) => r.data.data),

  removeOrgEntitlement: (id: string, overrideId: string) =>
    superAdminClient.delete(`/super-admin/organizations/${id}/entitlements/${overrideId}`).then(() => undefined),

  getOrgMessagingHealth: (id: string) =>
    superAdminClient.get<any>(`/super-admin/organizations/${id}/messaging-health`).then((r) => r.data.data),

  suspendOrg: (id: string, reason: string) =>
    superAdminClient.post<any>(`/super-admin/organizations/${id}/suspend`, { reason }).then((r) => r.data.data),

  reactivateOrg: (id: string) =>
    superAdminClient.post<any>(`/super-admin/organizations/${id}/reactivate`).then((r) => r.data.data),

  cancelOrgSubscription: (id: string, reason: string) =>
    superAdminClient
      .post<any>(`/super-admin/organizations/${id}/subscription/cancel`, { reason })
      .then((r) => r.data.data),

  changeOrgPlan: (id: string, planId: string) =>
    superAdminClient
      .post<any>(`/super-admin/organizations/${id}/subscription/change-plan`, { planId })
      .then((r) => r.data.data),

  extendOrgTrial: (id: string, days: number) =>
    superAdminClient
      .post<any>(`/super-admin/organizations/${id}/subscription/extend-trial`, { days })
      .then((r) => r.data.data),

  listSubscriptions: (params?: { page?: number; limit?: number; status?: string }) =>
    superAdminClient.get<any>("/super-admin/subscriptions", { params }).then((r) => r.data.data),

  listTickets: (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    priority?: string;
    orgId?: string;
    /** 'me' | 'unassigned' | super admin id */
    assignee?: string;
  }) => superAdminClient.get<any>("/super-admin/tickets", { params }).then((r) => r.data.data),

  listTicketAssignees: () =>
    superAdminClient
      .get<{ data: { id: string; name: string; email: string }[] }>("/super-admin/tickets/assignees")
      .then((r) => r.data.data),

  assignTicket: (id: string, assigneeId: string | null) =>
    superAdminClient.patch<any>(`/super-admin/tickets/${id}/assignee`, { assigneeId }).then((r) => r.data.data),

  getTicket: (id: string) =>
    superAdminClient.get<any>(`/super-admin/tickets/${id}`).then((r) => r.data.data),

  createTicket: (data: { title: string; description: string; category: string; priority?: string }) =>
    superAdminClient.post<any>("/super-admin/tickets", data).then((r) => r.data.data),

  /** `internal` = staff-only note, never shown to the customer */
  replyToTicket: (id: string, body: string, internal = false) =>
    superAdminClient.post<any>(`/super-admin/tickets/${id}/replies`, { body, internal }).then((r) => r.data.data),

  updateTicketStatus: (id: string, status: string) =>
    superAdminClient.patch<any>(`/super-admin/tickets/${id}/status`, { status }).then((r) => r.data.data),

  listPlans: () =>
    superAdminClient.get<any>("/super-admin/plans").then((r) => r.data.data),

  createPlan: (data: Record<string, unknown>) =>
    superAdminClient.post<any>("/super-admin/plans", data).then((r) => r.data.data),

  updatePlan: (id: string, data: Record<string, unknown>) =>
    superAdminClient.patch<any>(`/super-admin/plans/${id}`, data).then((r) => r.data.data),
};
