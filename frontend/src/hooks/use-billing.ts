"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { billingApi } from "@/lib/api/billing";
import type { ListPaymentsParams, ListInvoicesParams } from "@/lib/types/billing";

// ─── Query Key Factory ───

export const billingKeys = {
  all: ["billing"] as const,
  plans: () => ["billing", "plans"] as const,
  subscription: () => ["billing", "subscription"] as const,
  payments: (params?: ListPaymentsParams) =>
    ["billing", "payments", params] as const,
  payment: (id: string) => ["billing", "payment", id] as const,
  invoices: (params?: ListInvoicesParams) =>
    ["billing", "invoices", params] as const,
  invoice: (id: string) => ["billing", "invoice", id] as const,
};

// ─── Query Hooks ───

export function usePlans() {
  return useQuery({
    queryKey: billingKeys.plans(),
    queryFn: () => billingApi.listPlans(),
  });
}

/** Returns { subscription, usage } in a single call */
export function useSubscription(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: billingKeys.subscription(),
    queryFn: () => billingApi.getSubscription(),
    enabled: options?.enabled,
  });
}

export function usePayments(params?: ListPaymentsParams) {
  return useQuery({
    queryKey: billingKeys.payments(params),
    queryFn: () => billingApi.listPayments(params),
  });
}

export function useInvoices(params?: ListInvoicesParams) {
  return useQuery({
    queryKey: billingKeys.invoices(params),
    queryFn: () => billingApi.listInvoices(params),
  });
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: billingKeys.invoice(id ?? ""),
    queryFn: () => billingApi.getInvoice(id!),
    enabled: !!id,
  });
}

export function usePayment(id: string | null) {
  return useQuery({
    queryKey: billingKeys.payment(id ?? ""),
    queryFn: () => billingApi.getPayment(id!),
    enabled: !!id,
  });
}

// ─── Mutation Hooks ───

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof billingApi.createPlan>[0]) =>
      billingApi.createPlan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.plans() });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof billingApi.updatePlan>[1] }) =>
      billingApi.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.plans() });
    },
  });
}

export function useSubscribeToPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (planId: string) => billingApi.subscribe(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useChangePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (newPlanId: string) => billingApi.changePlan(newPlanId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useCancelSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reason?: string) => billingApi.cancelSubscription(reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.subscription() });
    },
  });
}

export function useReactivateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => billingApi.reactivateSubscription(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}

export function useCreateOrder() {
  return useMutation({
    mutationFn: (planId: string) => billingApi.createOrder(planId),
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof billingApi.verifyPayment>[0]) =>
      billingApi.verifyPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}
