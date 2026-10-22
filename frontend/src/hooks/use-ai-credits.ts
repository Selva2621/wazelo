"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { aiCreditsApi } from "@/lib/api/ai-credits";
import { billingKeys } from "@/hooks/use-billing";

export const aiCreditKeys = {
  all: ["ai-credits"] as const,
  overview: () => ["ai-credits", "overview"] as const,
  history: (page: number) => ["ai-credits", "history", page] as const,
};

/** Balance, packs and costs. Refreshed every minute so the header pill follows AI usage. */
export function useAiCredits(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: aiCreditKeys.overview(),
    queryFn: aiCreditsApi.get,
    enabled: options?.enabled ?? true,
    refetchInterval: 60_000,
    // Employees without billing access get a 403: no pill, no retry storm
    retry: false,
  });
}

export function useAiCreditHistory(page: number) {
  return useQuery({
    queryKey: aiCreditKeys.history(page),
    queryFn: () => aiCreditsApi.history(page),
    placeholderData: (prev) => prev,
  });
}

export function useCreateAiCreditOrder() {
  return useMutation({ mutationFn: aiCreditsApi.createOrder });
}

export function useVerifyAiCreditPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aiCreditsApi.verify,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: aiCreditKeys.all });
      // The purchase shows up in payments + invoices
      qc.invalidateQueries({ queryKey: billingKeys.all });
    },
  });
}
