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
  | ({ requiresTwoFactor: false; requiresTwoFactorSetup: false; requiresPasswordChange: false } & SuperAdminSession)
  /** Account has 2FA: enter a code (or a recovery code) */
  | { requiresTwoFactor: true; requiresTwoFactorSetup: false; requiresPasswordChange: false; challengeToken: string }
  /** 2FA is mandatory and this account has none yet: enrol before signing in */
  | { requiresTwoFactor: false; requiresTwoFactorSetup: true; requiresPasswordChange: false; challengeToken: string }
  /** Account was created with a temporary password: replace it before continuing */
  | { requiresTwoFactor: false; requiresTwoFactorSetup: false; requiresPasswordChange: true; challengeToken: string };

/** A super admin as listed on the Team page. */
export interface SuperAdminMember {
  id: string;
  name: string;
  email: string;
  totpEnabled: boolean;
  /** Still on the temporary password from account creation */
  mustChangePassword: boolean;
  disabledAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  createdById: string | null;
  isYou: boolean;
  /** Temporarily locked after too many failed sign-ins */
  locked: boolean;
}

export interface SuperAdminActiveSession {
  /** Session family id — stable across token refreshes */
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  current: boolean;
}

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
  /** Trials ending within the next 7 days */
  trialsEndingIn7Days: number;
  pastDueSubscriptions: number;
  expiredSubscriptions: number;
  /** One entry per currency, largest MRR first */
  revenue: CurrencyRevenue[];
  newOrgsLast30Days: number;
  churnedLast30Days: number;
  openTickets: number;
}

export type TicketSlaState = "met" | "missed" | "due" | "breached" | "none";

/** First-response SLA, computed by the server for the ticket list. */
export interface TicketSla {
  dueAt: string;
  state: TicketSlaState;
  /** Open ticket where the customer spoke last (or nobody replied yet) */
  waitingOnSupport: boolean;
}

/** A row of GET /super-admin/tickets. */
export interface SATicketListItem {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt?: string;
  firstResponseAt: string | null;
  lastReplyBy: "CUSTOMER" | "SUPPORT" | null;
  lastReplyAt: string | null;
  user?: { id: string; firstName: string; lastName: string; email: string } | null;
  organization?: { id: string; name: string; slug: string } | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  sla: TicketSla;
}

export interface SATicketList {
  tickets: SATicketListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

type SearchOrgRef = { id: string; name: string };

export interface SAGlobalSearchResult {
  query: string;
  orgs: { id: string; name: string; slug: string; deletedAt: string | null }[];
  users: { id: string; firstName: string; lastName: string; email: string; organization: SearchOrgRef }[];
  phoneNumbers: { id: string; phoneNumber: string; status: string; organization: SearchOrgRef }[];
  tickets: { id: string; title: string; status: string; organization: SearchOrgRef }[];
  invoices: { id: string; invoiceNumber: string; status: string; organization: SearchOrgRef }[];
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

export interface AuditLogQuery extends ListSortParams {
  page?: number;
  limit?: number;
  action?: string;
  orgId?: string;
  from?: string;
  to?: string;
  /** Case-insensitive substring match on the acting admin's email */
  search?: string;
}

export interface PlatformUsage {
  days: number;
  /** One per UTC day, oldest first; empty days are zeros */
  daily: { date: string; outbound: number; inbound: number; failed: number }[];
  totals: { outbound: number; inbound: number; failed: number };
  /** Busiest orgs by outbound messages in the window */
  topOrgs: { orgId: string; name: string; outbound: number; failed: number }[];
}

export interface GrowthPoint {
  month: string;
  newOrgs: number;
  newPaying: number;
  churned: number;
  /** Collected payments per currency, minor units */
  revenue: Record<string, number>;
}

export interface BillingListQuery extends ListSortParams {
  page?: number;
  limit?: number;
  status?: string;
  orgId?: string;
  /** Case-insensitive substring match on org name or invoice number */
  search?: string;
}

/**
 * Column sort for the super admin lists. Each list has a server-side whitelist of fields;
 * anything else falls back to newest first.
 */
export interface ListSortParams {
  sort?: string;
  order?: "asc" | "desc";
}

/** Lists that can be downloaded as CSV (GET /super-admin/<list>/export.csv). */
export type SAExportList = "organizations" | "subscriptions" | "payments" | "invoices" | "tickets" | "audit-logs";

export interface CsvDownload {
  blob: Blob;
  filename: string;
  /** More rows matched than the 10,000-row export cap; only the first 10,000 are in the file */
  truncated: boolean;
}

/** `attachment; filename="organizations-2026-10-10.csv"` → `organizations-2026-10-10.csv` */
function filenameFromDisposition(header: unknown): string | null {
  if (typeof header !== "string") return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Super admin inbox entry (e.g. new ticket, customer reply) */
export interface SuperAdminNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** How a limit/feature edit reaches a plan's existing subscribers */
export type PlanEditMode = "apply_to_all" | "new_version";

export interface PlanUpdateResult {
  plan: { id: string; version: number; name: string };
  mode: PlanEditMode;
  /** Subscribers whose limits changed (0 for a new version) */
  subscribersAffected: number;
}

export interface TwoFactorSetup {
  secret: string;
  otpAuthUrl: string;
  qrCodeDataUrl: string;
}

export type KillSwitchFeature = "campaigns" | "automation" | "api" | "ai" | "shopify";

/** Platform-wide OFF switch for one feature (all orgs, incl. scheduled work) */
export interface KillSwitch {
  feature: KillSwitchFeature;
  label: string;
  disabled: boolean;
  reason: string | null;
  disabledById: string | null;
  disabledBy?: { id: string; name: string; email: string } | null;
  disabledAt: string | null;
  updatedAt: string | null;
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

  /** Mandatory 2FA enrolment during sign-in: a new secret + QR code. */
  loginTwoFactorSetup: (challengeToken: string) =>
    superAdminClient
      .post<{ data: TwoFactorSetup }>("/super-admin/auth/login/2fa/setup", { challengeToken })
      .then((r) => r.data.data),

  /** Confirms the first code, turns 2FA on and signs in. Recovery codes are returned once. */
  loginTwoFactorEnroll: (challengeToken: string, code: string) =>
    superAdminClient
      .post<{ data: SuperAdminSession & { recoveryCodes: string[] } }>("/super-admin/auth/login/2fa/enroll", {
        challengeToken,
        code,
      })
      .then((r) => r.data.data),

  /** Replaces a temporary password during sign-in. Returns the next login step (or a session). */
  loginPasswordChange: (challengeToken: string, newPassword: string) =>
    superAdminClient
      .post<{ data: SuperAdminLoginResponse }>("/super-admin/auth/login/password", { challengeToken, newPassword })
      .then((r) => r.data.data),

  /** Changes the signed-in admin's password. Other devices are signed out. */
  changePassword: (currentPassword: string, newPassword: string) =>
    superAdminClient
      .post<{ data: { otherSessionsSignedOut: number } }>("/super-admin/auth/password", {
        currentPassword,
        newPassword,
      })
      .then((r) => r.data.data),

  listAdmins: () =>
    superAdminClient
      .get<{ data: { admins: SuperAdminMember[] } }>("/super-admin/admins")
      .then((r) => r.data.data.admins),

  /** The temporary password is returned once and never again. */
  createAdmin: (body: { name: string; email: string }) =>
    superAdminClient
      .post<{ data: { admin: { id: string; name: string; email: string }; temporaryPassword: string } }>(
        "/super-admin/admins",
        body,
      )
      .then((r) => r.data.data),

  disableAdmin: (id: string) =>
    superAdminClient
      .post<{ data: { id: string; disabled: boolean } }>(`/super-admin/admins/${id}/disable`)
      .then((r) => r.data.data),

  enableAdmin: (id: string) =>
    superAdminClient
      .post<{ data: { id: string; disabled: boolean } }>(`/super-admin/admins/${id}/enable`)
      .then((r) => r.data.data),

  /** Removes their 2FA and signs them out everywhere; they re-enrol at next sign-in. */
  resetAdminTwoFactor: (id: string) =>
    superAdminClient
      .post<{ data: { id: string } }>(`/super-admin/admins/${id}/reset-2fa`)
      .then((r) => r.data.data),

  /** Signs out this device and clears the refresh cookie. */
  logout: () => superAdminClient.post("/super-admin/auth/logout").then(() => undefined),

  /** Signs out every device, this one included. */
  logoutAll: () => superAdminClient.post("/super-admin/auth/logout-all").then(() => undefined),

  listSessions: () =>
    superAdminClient
      .get<{ data: SuperAdminActiveSession[] }>("/super-admin/auth/sessions")
      .then((r) => r.data.data),

  revokeSession: (id: string) =>
    superAdminClient.delete(`/super-admin/auth/sessions/${id}`).then(() => undefined),

  regenerateRecoveryCodes: (code: string) =>
    superAdminClient
      .post<{ data: { recoveryCodes: string[] } }>("/super-admin/auth/2fa/recovery-codes", { code })
      .then((r) => r.data.data),

  me: () =>
    superAdminClient.get<{ data: SuperAdminInfo }>("/super-admin/auth/me").then((r) => r.data.data),

  setupTwoFactor: () =>
    superAdminClient.post<{ data: TwoFactorSetup }>("/super-admin/auth/2fa/setup").then((r) => r.data.data),

  /** Returns the profile plus recovery codes (shown once). Other devices are signed out. */
  enableTwoFactor: (code: string) =>
    superAdminClient
      .post<{ data: SuperAdminInfo & { recoveryCodes: string[] } }>("/super-admin/auth/2fa/enable", { code })
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

  /** Partial edit; send only the fields that changed (`endsAt: null` clears the end). */
  updateAnnouncement: (id: string, data: Record<string, unknown>) =>
    superAdminClient
      .patch<{ data: Record<string, unknown> }>(`/super-admin/announcements/${id}`, data)
      .then((r) => r.data.data),

  archiveAnnouncement: (id: string) =>
    superAdminClient.post<any>(`/super-admin/announcements/${id}/archive`).then((r) => r.data.data),

  /** Undoes an archive; people who already dismissed it don't see it again. */
  restoreAnnouncement: (id: string) =>
    superAdminClient.post<any>(`/super-admin/announcements/${id}/restore`).then((r) => r.data.data),

  getUsage: (days = 30) =>
    superAdminClient
      .get<{ data: PlatformUsage }>("/super-admin/analytics/usage", { params: { days } })
      .then((r) => r.data.data),

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

  listOrgs: (params?: { page?: number; limit?: number; search?: string; status?: string } & ListSortParams) =>
    superAdminClient.get<any>("/super-admin/organizations", { params }).then((r) => r.data.data),

  getOrg: (id: string) =>
    superAdminClient.get<any>(`/super-admin/organizations/${id}`).then((r) => r.data.data),

  listKillSwitches: () =>
    superAdminClient
      .get<{ data: KillSwitch[] }>("/super-admin/system/kill-switches")
      .then((r) => r.data.data),

  /** `reason` is required (3–500 chars) when disabling */
  setKillSwitch: (feature: KillSwitchFeature, body: { disabled: boolean; reason?: string }) =>
    superAdminClient
      .post<{ data: KillSwitch }>(`/super-admin/system/kill-switches/${feature}`, body)
      .then((r) => r.data.data),

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

  listSubscriptions: (params?: { page?: number; limit?: number; status?: string; search?: string } & ListSortParams) =>
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
    /** Case-insensitive substring match on ticket title or org name */
    search?: string;
    /** Only open tickets where support didn't reply last */
    needsReply?: boolean;
  } & ListSortParams) =>
    superAdminClient.get<{ data: SATicketList }>("/super-admin/tickets", { params }).then((r) => r.data.data),

  /**
   * Downloads a list as CSV with the given filters + sort (paging is ignored). The file is
   * not wrapped in { success, data }; `truncated` is set when more than 10,000 rows matched.
   */
  exportCsv: (list: SAExportList, params: Record<string, unknown>) => {
    const filters = Object.fromEntries(Object.entries(params).filter(([k]) => k !== "page" && k !== "limit"));
    return superAdminClient
      .get<Blob>(`/super-admin/${list}/export.csv`, { params: filters, responseType: "blob" })
      .then(
        (r): CsvDownload => ({
          blob: r.data,
          filename: filenameFromDisposition(r.headers["content-disposition"]) ?? `${list}.csv`,
          truncated: r.headers["x-export-truncated"] === "true",
        }),
      );
  },

  /** Platform-wide lookup (max 5 per group). Under 2 chars the lists come back empty. */
  globalSearch: (q: string, signal?: AbortSignal) =>
    superAdminClient
      .get<{ data: SAGlobalSearchResult }>("/super-admin/search", { params: { q }, signal })
      .then((r) => r.data.data),

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

  /** `mode` is required when changing limits/features of a plan with live subscribers. */
  updatePlan: (id: string, data: Record<string, unknown>) =>
    superAdminClient
      .patch<{ data: PlanUpdateResult }>(`/super-admin/plans/${id}`, data)
      .then((r) => r.data.data),

  /** Off sale and hidden by default; existing subscribers keep the plan. */
  archivePlan: (id: string) =>
    superAdminClient.post<{ data: { plan: unknown } }>(`/super-admin/plans/${id}/archive`).then((r) => r.data.data),

  /** Back in the list, still inactive until activated. */
  unarchivePlan: (id: string) =>
    superAdminClient.post<{ data: { plan: unknown } }>(`/super-admin/plans/${id}/unarchive`).then((r) => r.data.data),

  /** Only for plans that never had a subscription — the server refuses otherwise. */
  deletePlan: (id: string) => superAdminClient.delete(`/super-admin/plans/${id}`).then(() => undefined),

  listNotifications: (unreadOnly = false) =>
    superAdminClient
      .get<{ data: { notifications: SuperAdminNotification[]; unreadCount: number } }>(
        "/super-admin/notifications",
        { params: unreadOnly ? { unreadOnly: true } : {} },
      )
      .then((r) => r.data.data),

  markNotificationRead: (id: string) =>
    superAdminClient.post(`/super-admin/notifications/${id}/read`).then(() => undefined),

  markAllNotificationsRead: () =>
    superAdminClient.post("/super-admin/notifications/read-all").then(() => undefined),

  /** Edits an org's identity. Send only the fields that changed. */
  updateOrg: (id: string, data: OrgIdentityUpdate) =>
    superAdminClient
      .patch<{ data: { org: Record<string, unknown> } }>(`/super-admin/organizations/${id}`, data)
      .then((r) => r.data.data),

  /** Soft-deletes an org: users locked out, sessions revoked, live subscription cancelled. */
  deleteOrg: (id: string, body: { confirmName: string; reason: string }) =>
    superAdminClient
      .post<{ data: OrgDeleteResult }>(`/super-admin/organizations/${id}/delete`, body)
      .then((r) => r.data.data),

  /** Undoes a delete within 30 days. The cancelled subscription is not revived. */
  restoreOrg: (id: string) =>
    superAdminClient
      .post<{ data: { restored: true } }>(`/super-admin/organizations/${id}/restore`)
      .then((r) => r.data.data),

  /** Full data export of one org (audited server-side). */
  exportOrg: (id: string) =>
    superAdminClient
      .get<{ data: OrgExport }>(`/super-admin/organizations/${id}/export`)
      .then((r) => r.data.data),

  /** Records a refund already made in the gateway dashboard. No money moves. */
  recordPaymentRefund: (paymentId: string, body: RecordRefundBody) =>
    superAdminClient
      .post<{ data: { refund: PaymentRefund; fullyRefunded: boolean } }>(`/super-admin/payments/${paymentId}/refunds`, body)
      .then((r) => r.data.data),

  getOrgCredits: (id: string) =>
    superAdminClient
      .get<{ data: OrgCredits }>(`/super-admin/organizations/${id}/credits`)
      .then((r) => r.data.data),

  grantOrgCredit: (id: string, body: CreditChangeBody) =>
    superAdminClient
      .post<{ data: CreditChangeResult }>(`/super-admin/organizations/${id}/credits`, body)
      .then((r) => r.data.data),

  /** Amount must not exceed the current balance in that currency. */
  revokeOrgCredit: (id: string, body: CreditChangeBody) =>
    superAdminClient
      .post<{ data: CreditChangeResult }>(`/super-admin/organizations/${id}/credits/revoke`, body)
      .then((r) => r.data.data),

  /** Manual invoice, created OPEN. */
  createInvoice: (body: CreateInvoiceBody) =>
    superAdminClient.post<{ data: SAInvoice }>("/super-admin/invoices", body).then((r) => r.data.data),

  /** Only OPEN/DRAFT invoices. Records payment taken outside the gateway. */
  markInvoicePaid: (id: string, body: { note?: string; paidAt?: string }) =>
    superAdminClient.post<{ data: SAInvoice }>(`/super-admin/invoices/${id}/mark-paid`, body).then((r) => r.data.data),

  /** Only OPEN/DRAFT invoices. */
  voidInvoice: (id: string, reason: string) =>
    superAdminClient.post<{ data: SAInvoice }>(`/super-admin/invoices/${id}/void`, { reason }).then((r) => r.data.data),

  listCoupons: () =>
    superAdminClient.get<{ data: { coupons: Coupon[] } }>("/super-admin/coupons").then((r) => r.data.data.coupons),

  /** 409 when the code already exists. */
  createCoupon: (body: CreateCouponBody) =>
    superAdminClient.post<{ data: Coupon }>("/super-admin/coupons", body).then((r) => r.data.data),

  deactivateCoupon: (id: string) =>
    superAdminClient.post<{ data: Coupon }>(`/super-admin/coupons/${id}/deactivate`).then((r) => r.data.data),
};

export type CreditEntryKind = "GRANT" | "APPLIED" | "REVOKED";

export interface CreditEntry {
  id: string;
  currency: string;
  /** Minor units, signed: + grant, - applied/revoked */
  amountInCents: number;
  kind: CreditEntryKind;
  reason: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  createdById: string | null;
  createdAt: string;
}

export interface OrgCredits {
  balances: { currency: string; balanceInCents: number }[];
  /** Newest first, max 200 */
  entries: CreditEntry[];
}

export interface CreditChangeBody {
  /** Minor units, > 0 */
  amountInCents: number;
  currency: string;
  reason: string;
}

export interface CreditChangeResult {
  entry: CreditEntry;
  balanceInCents: number;
}

export interface InvoiceLineItemInput {
  description: string;
  quantity: number;
  /** Minor units */
  unitAmountInCents: number;
}

export interface CreateInvoiceBody {
  orgId: string;
  currency: string;
  /** ISO date */
  dueDate: string;
  note?: string;
  lineItems: InvoiceLineItemInput[];
}

/** An invoice row as the super admin API returns it. */
export interface SAInvoice {
  id: string;
  orgId: string;
  subscriptionId: string | null;
  invoiceNumber: string;
  amountInCents: number;
  currency: string;
  status: string;
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  metadata?: { manual?: boolean; createdById?: string; note?: string } & Record<string, unknown> | null;
}

export type CouponKind = "PERCENT" | "FIXED";

export interface Coupon {
  id: string;
  code: string;
  kind: CouponKind;
  percentOff: number | null;
  amountOffInCents: number | null;
  currency: string | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  validFrom: string | null;
  validUntil: string | null;
  /** Empty = all plans */
  appliesToPlanIds: string[];
  firstPaymentOnly: boolean;
  active: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  plans: { id: string; name: string; billingCycle: string }[];
}

export interface CreateCouponBody {
  code: string;
  kind: CouponKind;
  percentOff?: number;
  amountOffInCents?: number;
  currency?: string;
  maxRedemptions?: number;
  validFrom?: string;
  validUntil?: string;
  appliesToPlanIds?: string[];
}

export interface PaymentRefund {
  id: string;
  /** Minor units (paise/cents) */
  amountInCents: number;
  reason: string;
  externalRefundId: string | null;
  createdAt: string;
}

export interface RecordRefundBody {
  /** Minor units (paise/cents), at least 1 */
  amountInCents: number;
  reason: string;
  externalRefundId?: string;
}

export interface OrgIdentityUpdate {
  name?: string;
  slug?: string;
  /** IANA zone, e.g. Asia/Kolkata */
  timezone?: string;
}

export interface OrgDeleteResult {
  deleted: true;
  restorableUntil: string;
  sessionsRevoked: number;
  cancelledSubscriptionId: string | null;
}

export interface OrgExport {
  org: { slug?: string; name?: string } & Record<string, unknown>;
  users: unknown[];
  contacts: unknown[];
  contactTotal: number;
  /** Contacts are capped at 100,000 rows */
  contactsTruncated: boolean;
  subscriptions: unknown[];
  invoices: unknown[];
  payments: unknown[];
  counts: Record<string, number>;
  exportedAt: string;
  exportedBy: string;
  note: string;
}
