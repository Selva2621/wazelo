"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { superAdminApi } from "@/lib/api/super-admin";

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

export function useSAArchiveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => superAdminApi.archiveAnnouncement(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "announcements"] }),
  });
}

export function useSAGrowth(months = 12) {
  return useQuery({ queryKey: ["sa", "growth", months], queryFn: () => superAdminApi.getGrowth(months) });
}

export function useSAPayments(params: Parameters<typeof superAdminApi.listPayments>[0]) {
  return useQuery({
    queryKey: ["sa", "payments", params],
    queryFn: () => superAdminApi.listPayments(params),
    placeholderData: (prev) => prev,
  });
}

export function useSAInvoices(params: Parameters<typeof superAdminApi.listInvoices>[0]) {
  return useQuery({
    queryKey: ["sa", "invoices", params],
    queryFn: () => superAdminApi.listInvoices(params),
    placeholderData: (prev) => prev,
  });
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
    onSuccess: (profile) => qc.setQueryData(["sa", "me"], profile),
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
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      superAdminApi.updatePlan(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sa", "plans"] }),
  });
}
