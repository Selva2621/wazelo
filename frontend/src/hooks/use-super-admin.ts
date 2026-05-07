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

export function useSAOrgs(params?: Parameters<typeof superAdminApi.listOrgs>[0]) {
  return useQuery({ queryKey: saKeys.orgs(params), queryFn: () => superAdminApi.listOrgs(params) });
}

export function useSAOrg(id: string) {
  return useQuery({ queryKey: saKeys.org(id), queryFn: () => superAdminApi.getOrg(id), enabled: !!id });
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

export function useSAReplyToTicket(ticketId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) => superAdminApi.replyToTicket(ticketId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: saKeys.ticket(ticketId) }),
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
