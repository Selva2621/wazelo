import apiClient from "./client";
import type {
  Plan,
  SubscriptionWithUsage,
  ChangePlanResponse,
  Payment,
  Invoice,
  PaginatedResponse,
  ListPaymentsParams,
  ListInvoicesParams,
} from "@/lib/types/billing";

// apiClient response interceptor already unwraps { success, data } envelope.
// So r.data is the actual payload returned by the use case.

export const billingApi = {
  // ─── Plans ───

  listPlans: () =>
    apiClient
      .get<{ plans: Plan[] }>("/billing/plans")
      .then((r) => r.data.plans),

  createPlan: (data: Partial<Plan>) =>
    apiClient.post<{ plan: Plan }>("/billing/plans", data).then((r) => r.data.plan),

  updatePlan: (id: string, data: Partial<Plan>) =>
    apiClient.patch<{ plan: Plan }>(`/billing/plans/${id}`, data).then((r) => r.data.plan),

  // ─── Subscription + Usage (single endpoint) ───

  getSubscription: () =>
    apiClient
      .get<SubscriptionWithUsage>("/billing/subscription")
      .then((r) => r.data),

  subscribe: (planId: string, idempotencyKey?: string) =>
    apiClient
      .post<{ subscription: any; deduplicated: boolean }>("/billing/subscribe", { planId, idempotencyKey })
      .then((r) => r.data),

  createOrder: (planId: string) =>
    apiClient
      .post<{ orderId: string; amount: number; currency: string; planName: string }>(
        "/billing/create-order",
        { planId },
      )
      .then((r) => r.data),

  verifyPayment: (data: {
    planId: string;
    orderId: string;
    razorpayPaymentId: string;
    signature: string;
    idempotencyKey?: string;
  }) =>
    apiClient
      .post<{ subscription: any; deduplicated: boolean }>("/billing/verify-payment", data)
      .then((r) => r.data),

  changePlan: (newPlanId: string, idempotencyKey?: string) =>
    apiClient
      .post<ChangePlanResponse>("/billing/change-plan", { newPlanId, idempotencyKey })
      .then((r) => r.data),

  cancelSubscription: (reason?: string) =>
    apiClient
      .post<{ subscription: any }>("/billing/cancel", { reason })
      .then((r) => r.data),

  reactivateSubscription: () =>
    apiClient
      .post<{ subscription: any }>("/billing/reactivate")
      .then((r) => r.data),

  // ─── Invoices ───

  listInvoices: (params?: ListInvoicesParams) =>
    apiClient
      .get<PaginatedResponse<Invoice>>("/billing/invoices", { params })
      .then((r) => r.data),

  getInvoice: (id: string) =>
    apiClient
      .get<Invoice>(`/billing/invoices/${id}`)
      .then((r) => r.data),

  // ─── Payments ───

  listPayments: (params?: ListPaymentsParams) =>
    apiClient
      .get<PaginatedResponse<Payment>>("/billing/payments", { params })
      .then((r) => r.data),

  getPayment: (id: string) =>
    apiClient
      .get<Payment>(`/billing/payments/${id}`)
      .then((r) => r.data),
};
