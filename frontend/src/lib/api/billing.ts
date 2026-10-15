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

export interface CouponValidation {
  valid: boolean;
  /** Minor units */
  discountInCents: number;
  finalAmountInCents: number;
  currency: string;
  message: string;
}

// apiClient response interceptor already unwraps { success, data } envelope.
// So r.data is the actual payload returned by the use case.

export const billingApi = {
  // ─── Plans ───

  listPlans: () =>
    apiClient
      .get<{ plans: Plan[] }>("/billing/plans")
      .then((r) => r.data.plans),

  // Plan create/update is super-admin only — see lib/api/super-admin.ts

  // ─── Subscription + Usage (single endpoint) ───

  getSubscription: () =>
    apiClient
      .get<SubscriptionWithUsage>("/billing/subscription")
      .then((r) => r.data),

  /** `couponCode` only matters for a 100%-off coupon on a paid plan without trial. */
  subscribe: (planId: string, idempotencyKey?: string, couponCode?: string) =>
    apiClient
      .post<{ subscription: any; deduplicated: boolean }>("/billing/subscribe", {
        planId,
        idempotencyKey,
        ...(couponCode ? { couponCode } : {}),
      })
      .then((r) => r.data),

  /** `amount` is after any coupon discount. 400 when a coupon covers the full price — use subscribe instead. */
  createOrder: (planId: string, couponCode?: string) =>
    apiClient
      .post<{
        orderId: string;
        amount: number;
        currency: string;
        planName: string;
        discountInCents?: number;
        originalAmount?: number;
      }>("/billing/create-order", { planId, ...(couponCode ? { couponCode } : {}) })
      .then((r) => r.data),

  validateCoupon: (code: string, planId: string) =>
    apiClient
      .post<CouponValidation>("/billing/coupons/validate", { code, planId })
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
