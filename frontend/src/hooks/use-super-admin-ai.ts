"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { superAdminAiApi, type SAAiCreditPack } from "@/lib/api/super-admin-ai";

const aiKey = ["sa", "ai"] as const;
const usageKey = ["sa", "ai", "usage"] as const;

export function useSAAiSettings() {
  return useQuery({ queryKey: aiKey, queryFn: superAdminAiApi.get });
}

export function useSAUpdateAiSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: superAdminAiApi.update,
    onSuccess: (data) => qc.setQueryData(aiKey, data),
  });
}

export function useSATestAi() {
  return useMutation({ mutationFn: superAdminAiApi.test });
}

/** Model ids offered by `provider`, listed with `apiKey` when given (else the stored key). */
export function useSAAiModels(provider: string, apiKey: string) {
  const [key, setKey] = useState(apiKey);
  // Don't hit the provider on every keystroke of a pasted/typed key
  useEffect(() => {
    const t = setTimeout(() => setKey(apiKey), 500);
    return () => clearTimeout(t);
  }, [apiKey]);

  return useQuery({
    // The key itself is not part of the cache key; only whether one was typed and its length
    queryKey: ["sa", "ai", "models", provider, key ? `typed:${key.length}:${key.slice(-4)}` : "stored"],
    queryFn: () => superAdminAiApi.models(provider, key || undefined),
    enabled: !!provider,
    staleTime: 10 * 60_000,
  });
}

/** Platform AI usage, refreshed every minute. */
export function useSAAiUsage() {
  return useQuery({ queryKey: usageKey, queryFn: superAdminAiApi.usage, refetchInterval: 60_000 });
}

export function useSAAiPack(id: string | null) {
  return useQuery({
    queryKey: ["sa", "ai", "pack", id],
    queryFn: () => superAdminAiApi.getPack(id!),
    enabled: !!id,
  });
}

export function useSACreateAiPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: superAdminAiApi.createPack,
    onSuccess: () => qc.invalidateQueries({ queryKey: aiKey, exact: true }),
  });
}

export function useSAUpdateAiPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: { id: string } & Partial<Omit<SAAiCreditPack, "id" | "currency">>) =>
      superAdminAiApi.updatePack(id, body),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: aiKey, exact: true });
      qc.invalidateQueries({ queryKey: ["sa", "ai", "pack", vars.id] });
    },
  });
}
