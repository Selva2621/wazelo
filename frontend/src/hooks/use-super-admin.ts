"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  superAdminApi,
  type CreateCouponBody,
  type CreateInvoiceBody,
  type CreditChangeBody,
  type KillSwitchFeature,
  type PlanEditMode,
  type SAExportList,
} from "@/lib/api/super-admin";

const saKeys = {
  stats: () => ["sa", "stats"] as const,
  orgs: (p?: any) => ["sa", "orgs", p] as const,
  org: (id: string) => ["sa", "org", id] as const,
  subscriptions: (p?: any) => ["sa", "subscriptions", p] as const,
  tickets: (p?: any) => ["sa", "tickets", p] as const,
  ticket: (id: string) => ["sa", "ticket", id] as const,
};

export function useSAStats() {
  return useQuery({ queryKey: saKeys.stats(), queryFn: superAdminApi.getStats });
}

export function useSAAuditLogs(params: Parameters<typeof superAdminApi.listAuditLogs>[0]) {
  return useQuery({
    queryKey: ["sa", "audit-logs", params],
    queryFn: () => superAdminApi.listAuditLogs(params),
    placeholderData: (prev) => prev,
  });
}

export function useSAAnnouncements() {
  return useQuery({ queryKey: ["sa", "announcements"], queryFn: superAdminApi.listAnnouncements });
}

export function useSACreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => superAdminApi.createAnnouncement(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "announcements"] }),
  });
}

export function useSAUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      superAdminApi.updateAnnouncement(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "announcements"] }),
  });
}

export function useSARestoreAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminApi.restoreAnnouncement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "announcements"] }),
  });
}

export function useSAArchiveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminApi.archiveAnnouncement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "announcements"] }),
  });
}

export function useSAUsage(days = 30) {
  return useQuery({
    queryKey: ["sa", "usage", days],
    queryFn: () => superAdminApi.getUsage(days),
    placeholderData: (prev) => prev,
  });
}

export function useSAGrowth(months = 12) {
  return useQuery({ queryKey: ["sa", "growth", months], queryFn: () => superAdminApi.getGrowth(months) });
}

export function useSAPayments(params: Parameters<typeof superAdminApi.listPayments>[0], enabled = true) {
  return useQuery({
    queryKey: ["sa", "payments", params],
    queryFn: () => superAdminApi.listPayments(params),
    placeholderData: (prev) => prev,
    enabled,
  });
}

export function useSARecordPaymentRefund() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ paymentId, body }: { paymentId: string; body: Parameters<typeof superAdminApi.recordPaymentRefund>[1] }) =>
      superAdminApi.recordPaymentRefund(paymentId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "payments"] }),
  });
}

export function useSAInvoices(params: Parameters<typeof superAdminApi.listInvoices>[0], enabled = true) {
  return useQuery({
    queryKey: ["sa", "invoices", params],
    queryFn: () => superAdminApi.listInvoices(params),
    placeholderData: (prev) => prev,
    enabled,
  });
}

/** Manual invoices: create, mark paid, void. Each refreshes the invoice lists. */
export function useSAInvoiceActions() {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["sa", "invoices"] });
    qc.invalidateQueries({ queryKey: ["sa", "payments"] });
  };
  return {
    create: useMutation({ mutationFn: (body: CreateInvoiceBody) => superAdminApi.createInvoice(body), onSuccess: refresh }),
    markPaid: useMutation({
      mutationFn: ({ id, note, paidAt }: { id: string; note?: string; paidAt?: string }) =>
        superAdminApi.markInvoicePaid(id, { ...(note ? { note } : {}), ...(paidAt ? { paidAt } : {}) }),
      onSuccess: refresh,
    }),
    void: useMutation({
      mutationFn: ({ id, reason }: { id: string; reason: string }) => superAdminApi.voidInvoice(id, reason),
      onSuccess: refresh,
    }),
  };
}

/** An org's credit balances + ledger, with grant and revoke. */
export function useSAOrgCredits(orgId: string) {
  const qc = useQueryClient();
  const key = ["sa", "org", orgId, "credits"];
  const refresh = () => qc.invalidateQueries({ queryKey: key });
  return {
    query: useQuery({ queryKey: key, queryFn: () => superAdminApi.getOrgCredits(orgId), enabled: !!orgId }),
    grant: useMutation({ mutationFn: (body: CreditChangeBody) => superAdminApi.grantOrgCredit(orgId, body), onSuccess: refresh }),
    revoke: useMutation({ mutationFn: (body: CreditChangeBody) => superAdminApi.revokeOrgCredit(orgId, body), onSuccess: refresh }),
  };
}

const COUPONS_KEY = ["sa", "coupons"] as const;

export function useSACoupons() {
  return useQuery({ queryKey: COUPONS_KEY, queryFn: superAdminApi.listCoupons });
}

export function useSACouponActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: COUPONS_KEY });
  return {
    create: useMutation({ mutationFn: (body: CreateCouponBody) => superAdminApi.createCoupon(body), onSuccess: refresh }),
    deactivate: useMutation({ mutationFn: (id: string) => superAdminApi.deactivateCoupon(id), onSuccess: refresh }),
  };
}

export function useSAActivity(limit = 10) {
  return useQuery({ queryKey: ["sa", "activity", limit], queryFn: () => superAdminApi.getActivity(limit) });
}

export function useSAOrgs(params?: Parameters<typeof superAdminApi.listOrgs>[0]) {
  return useQuery({ queryKey: saKeys.orgs(params), queryFn: () => superAdminApi.listOrgs(params) });
}

export function useSAOrg(id: string) {
  return useQuery({ queryKey: saKeys.org(id), queryFn: () => superAdminApi.getOrg(id), enabled: !!id });
}

const platformSettingsKey = ["sa", "platform-settings"] as const;

/** Platform-wide settings (Settings page). */
export function useSAPlatformSettings() {
  return useQuery({ queryKey: platformSettingsKey, queryFn: superAdminApi.getPlatformSettings });
}

export function useSAUpdatePlatformSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: superAdminApi.updatePlatformSettings,
    onSuccess: (data) => qc.setQueryData(platformSettingsKey, data),
  });
}

const killSwitchesKey = ["sa", "kill-switches"] as const;

/** Platform kill switches (System page + dashboard banner). Polled so the banner stays current. */
export function useSAKillSwitches() {
  return useQuery({
    queryKey: killSwitchesKey,
    queryFn: superAdminApi.listKillSwitches,
    refetchInterval: 60_000,
  });
}

export function useSASetKillSwitch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feature, disabled, reason }: { feature: KillSwitchFeature; disabled: boolean; reason?: string }) =>
      superAdminApi.setKillSwitch(feature, { disabled, ...(reason ? { reason } : {}) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: killSwitchesKey }),
  });
}

export function useSAOrgEntitlements(orgId: string) {
  const qc = useQueryClient();
  const key = ["sa", "org", orgId, "entitlements"];
  const refresh = () => {
    qc.invalidateQueries({ queryKey: key });
    qc.invalidateQueries({ queryKey: saKeys.org(orgId) });
  };
  return {
    query: useQuery({ queryKey: key, queryFn: () => superAdminApi.getOrgEntitlements(orgId), enabled: !!orgId }),
    set: useMutation({ mutationFn: (data: Record<string, unknown>) => superAdminApi.setOrgEntitlement(orgId, data), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (overrideId: string) => superAdminApi.removeOrgEntitlement(orgId, overrideId), onSuccess: refresh }),
  };
}

export function useSAOrgMessagingHealth(id: string, enabled = true) {
  return useQuery({
    queryKey: ["sa", "org", id, "messaging-health"],
    queryFn: () => superAdminApi.getOrgMessagingHealth(id),
    enabled: !!id && enabled,
    refetchInterval: 60_000,
  });
}

/** Org-level admin actions; each refreshes the org, the lists and the dashboard. */
export function useSAOrgActions(orgId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: saKeys.org(orgId) });
    qc.invalidateQueries({ queryKey: ["sa", "orgs"] });
    qc.invalidateQueries({ queryKey: ["sa", "subscriptions"] });
    qc.invalidateQueries({ queryKey: saKeys.stats() });
    qc.invalidateQueries({ queryKey: ["sa", "activity"] });
  };
  return {
    suspend: useMutation({ mutationFn: (reason: string) => superAdminApi.suspendOrg(orgId, reason), onSuccess: refresh }),
    reactivate: useMutation({ mutationFn: () => superAdminApi.reactivateOrg(orgId), onSuccess: refresh }),
    cancelSubscription: useMutation({
      mutationFn: (reason: string) => superAdminApi.cancelOrgSubscription(orgId, reason),
      onSuccess: refresh,
    }),
    changePlan: useMutation({ mutationFn: (planId: string) => superAdminApi.changeOrgPlan(orgId, planId), onSuccess: refresh }),
    extendTrial: useMutation({ mutationFn: (days: number) => superAdminApi.extendOrgTrial(orgId, days), onSuccess: refresh }),
  };
}

export function useSASubscriptions(params?: Parameters<typeof superAdminApi.listSubscriptions>[0]) {
  return useQuery({ queryKey: saKeys.subscriptions(params), queryFn: () => superAdminApi.listSubscriptions(params) });
}

export function useSATickets(params?: Parameters<typeof superAdminApi.listTickets>[0]) {
  return useQuery({ queryKey: saKeys.tickets(params), queryFn: () => superAdminApi.listTickets(params) });
}

/** CSV export of a list (current filters + sort). The caller saves the returned file. */
export function useSAExportCsv() {
  return useMutation({
    mutationFn: ({ list, params }: { list: SAExportList; params: Record<string, unknown> }) =>
      superAdminApi.exportCsv(list, params),
  });
}

/** Global search; idle until the term has at least 2 characters. Pass an already-debounced term. */
export function useSAGlobalSearch(q: string) {
  return useQuery({
    queryKey: ["sa", "search", q],
    queryFn: ({ signal }) => superAdminApi.globalSearch(q, signal),
    enabled: q.length >= 2,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });
}

export function useSATicket(id: string) {
  return useQuery({ queryKey: saKeys.ticket(id), queryFn: () => superAdminApi.getTicket(id), enabled: !!id });
}

export function useSALogin() {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      superAdminApi.login(email, password),
  });
}

export function useSALoginTwoFactor() {
  return useMutation({
    mutationFn: ({ challengeToken, code }: { challengeToken: string; code: string }) =>
      superAdminApi.loginTwoFactor(challengeToken, code),
  });
}

export function useSALoginTwoFactorSetup() {
  return useMutation({ mutationFn: (challengeToken: string) => superAdminApi.loginTwoFactorSetup(challengeToken) });
}

export function useSALoginTwoFactorEnroll() {
  return useMutation({
    mutationFn: ({ challengeToken, code }: { challengeToken: string; code: string }) =>
      superAdminApi.loginTwoFactorEnroll(challengeToken, code),
  });
}

export function useSALoginPasswordChange() {
  return useMutation({
    mutationFn: ({ challengeToken, newPassword }: { challengeToken: string; newPassword: string }) =>
      superAdminApi.loginPasswordChange(challengeToken, newPassword),
  });
}

export function useSAChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) =>
      superAdminApi.changePassword(currentPassword, newPassword),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "sessions"] }),
  });
}

const ADMINS_KEY = ["sa", "admins"] as const;

export function useSAAdmins() {
  return useQuery({ queryKey: ADMINS_KEY, queryFn: superAdminApi.listAdmins });
}

export function useSACreateAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; email: string }) => superAdminApi.createAdmin(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}

export function useSASetAdminDisabled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) =>
      disabled ? superAdminApi.disableAdmin(id) : superAdminApi.enableAdmin(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}

export function useSAResetAdminTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminApi.resetAdminTwoFactor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
}

export function useSASessions() {
  return useQuery({ queryKey: ["sa", "sessions"], queryFn: superAdminApi.listSessions });
}

export function useSARevokeSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminApi.revokeSession(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "sessions"] }),
  });
}

export function useSALogoutAll() {
  return useMutation({ mutationFn: superAdminApi.logoutAll });
}

export function useSARegenerateRecoveryCodes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => superAdminApi.regenerateRecoveryCodes(code),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "me"] }),
  });
}

export function useSAMe() {
  return useQuery({ queryKey: ["sa", "me"], queryFn: superAdminApi.me });
}

export function useSASetupTwoFactor() {
  return useMutation({ mutationFn: superAdminApi.setupTwoFactor });
}

export function useSAEnableTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => superAdminApi.enableTwoFactor(code),
    onSuccess: (result) => {
      const profile = { ...result, recoveryCodes: undefined };
      qc.setQueryData(["sa", "me"], profile);
      qc.invalidateQueries({ queryKey: ["sa", "sessions"] });
    },
  });
}

export function useSADisableTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => superAdminApi.disableTwoFactor(code),
    onSuccess: (profile) => qc.setQueryData(["sa", "me"], profile),
  });
}

export function useSAReplyToTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ body, internal = false }: { body: string; internal?: boolean }) =>
      superAdminApi.replyToTicket(ticketId, body, internal),
    onSuccess: () => qc.invalidateQueries({ queryKey: saKeys.ticket(ticketId) }),
  });
}

export function useSATicketAssignees() {
  return useQuery({ queryKey: ["sa", "ticket-assignees"], queryFn: superAdminApi.listTicketAssignees, staleTime: 5 * 60_000 });
}

export function useSAAssignTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (assigneeId: string | null) => superAdminApi.assignTicket(ticketId, assigneeId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saKeys.ticket(ticketId) });
      qc.invalidateQueries({ queryKey: ["sa", "tickets"] });
    },
  });
}

export function useSAUpdateTicketStatus(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: string) => superAdminApi.updateTicketStatus(ticketId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: saKeys.ticket(ticketId) });
      qc.invalidateQueries({ queryKey: ["sa", "tickets"] });
    },
  });
}

export function useSACreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof superAdminApi.createTicket>[0]) =>
      superAdminApi.createTicket(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "tickets"] }),
  });
}

export function useSAPlans() {
  return useQuery({ queryKey: ["sa", "plans"], queryFn: superAdminApi.listPlans });
}

export function useSACreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => superAdminApi.createPlan(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "plans"] }),
  });
}

export function useSAUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data, mode }: { id: string; data: Record<string, unknown>; mode?: PlanEditMode }) =>
      superAdminApi.updatePlan(id, mode ? { ...data, mode } : data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "plans"] }),
  });
}

/** Archive, unarchive and delete a plan. Each refreshes the plan list. */
export function useSAPlanLifecycle() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["sa", "plans"] });
  return {
    archive: useMutation({ mutationFn: (id: string) => superAdminApi.archivePlan(id), onSuccess: refresh }),
    unarchive: useMutation({ mutationFn: (id: string) => superAdminApi.unarchivePlan(id), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id: string) => superAdminApi.deletePlan(id), onSuccess: refresh }),
  };
}

/** The signed-in super admin's inbox, polled every minute. */
export function useSANotifications() {
  return useQuery({
    queryKey: ["sa", "notifications"],
    queryFn: () => superAdminApi.listNotifications(),
    refetchInterval: 60_000,
  });
}

export function useSANotificationActions() {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["sa", "notifications"] });
  return {
    markRead: useMutation({ mutationFn: (id: string) => superAdminApi.markNotificationRead(id), onSuccess: refresh }),
    markAllRead: useMutation({ mutationFn: () => superAdminApi.markAllNotificationsRead(), onSuccess: refresh }),
  };
}

/** Edit identity, delete, restore and export one org. Mutations refresh the org, the lists and the dashboard. */
export function useSAOrgLifecycle(orgId: string) {
  const qc = useQueryClient();
  const refresh = () => {
    qc.invalidateQueries({ queryKey: saKeys.org(orgId) });
    qc.invalidateQueries({ queryKey: ["sa", "orgs"] });
    qc.invalidateQueries({ queryKey: ["sa", "subscriptions"] });
    qc.invalidateQueries({ queryKey: saKeys.stats() });
    qc.invalidateQueries({ queryKey: ["sa", "activity"] });
  };
  return {
    update: useMutation({
      mutationFn: (data: Parameters<typeof superAdminApi.updateOrg>[1]) => superAdminApi.updateOrg(orgId, data),
      onSuccess: refresh,
    }),
    remove: useMutation({
      mutationFn: (body: { confirmName: string; reason: string }) => superAdminApi.deleteOrg(orgId, body),
      onSuccess: refresh,
    }),
    restore: useMutation({ mutationFn: () => superAdminApi.restoreOrg(orgId), onSuccess: refresh }),
    exportData: useMutation({ mutationFn: () => superAdminApi.exportOrg(orgId) }),
  };
}
