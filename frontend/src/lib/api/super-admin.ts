import superAdminClient from "./super-admin-client";

// All responses are wrapped by NestJS TransformInterceptor: { success, data, timestamp }
// So actual payload is always at r.data.data

export const superAdminApi = {
  login: (email: string, password: string) =>
    superAdminClient
      .post<{ success: boolean; data: { accessToken: string; superAdmin: { id: string; name: string; email: string } } }>(
        "/super-admin/auth/login",
        { email, password },
      )
      .then((r) => r.data.data),

  getStats: () =>
    superAdminClient.get<any>("/super-admin/stats").then((r) => r.data.data),

  listOrgs: (params?: { page?: number; limit?: number; search?: string; status?: string }) =>
    superAdminClient.get<any>("/super-admin/organizations", { params }).then((r) => r.data.data),

  getOrg: (id: string) =>
    superAdminClient.get<any>(`/super-admin/organizations/${id}`).then((r) => r.data.data),

  listSubscriptions: (params?: { page?: number; limit?: number; status?: string }) =>
    superAdminClient.get<any>("/super-admin/subscriptions", { params }).then((r) => r.data.data),

  listTickets: (params?: { page?: number; limit?: number; status?: string; category?: string; priority?: string; orgId?: string }) =>
    superAdminClient.get<any>("/super-admin/tickets", { params }).then((r) => r.data.data),

  getTicket: (id: string) =>
    superAdminClient.get<any>(`/super-admin/tickets/${id}`).then((r) => r.data.data),

  createTicket: (data: { title: string; description: string; category: string; priority?: string }) =>
    superAdminClient.post<any>("/super-admin/tickets", data).then((r) => r.data.data),

  replyToTicket: (id: string, body: string) =>
    superAdminClient.post<any>(`/super-admin/tickets/${id}/replies`, { body }).then((r) => r.data.data),

  updateTicketStatus: (id: string, status: string) =>
    superAdminClient.patch<any>(`/super-admin/tickets/${id}/status`, { status }).then((r) => r.data.data),

  listPlans: () =>
    superAdminClient.get<any>("/super-admin/plans").then((r) => r.data.data),

  createPlan: (data: Record<string, unknown>) =>
    superAdminClient.post<any>("/super-admin/plans", data).then((r) => r.data.data),

  updatePlan: (id: string, data: Record<string, unknown>) =>
    superAdminClient.patch<any>(`/super-admin/plans/${id}`, data).then((r) => r.data.data),
};
