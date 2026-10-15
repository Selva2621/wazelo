"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { dealsApi } from "@/lib/api/deals";
import type { CreatePipelineRequest, CreateDealRequest, UpdateDealRequest, MoveDealRequest, DealGuard } from "@/lib/types/deals";

export const dealKeys = {
  all: ["deals"] as const,
  pipelines: () => ["deals", "pipelines"] as const,
  pipeline: (id: string) => ["deals", "pipelines", id] as const,
  deals: (pipelineId: string) => ["deals", "list", pipelineId] as const,
  analytics: (pipelineId: string) => ["deals", "analytics", pipelineId] as const,
  byContact: (contactId: string) => ["deals", "by-contact", contactId] as const,
  followUps: (scope: string) => ["deals", "follow-ups", scope] as const,
  guard: (dealId: string) => ["deals", "guard", dealId] as const,
};

export function usePipelines() {
  return useQuery({
    queryKey: dealKeys.pipelines(),
    queryFn: () => dealsApi.listPipelines(),
  });
}

export function useDeals(pipelineId: string | null) {
  return useQuery({
    queryKey: dealKeys.deals(pipelineId!),
    queryFn: () => dealsApi.listDeals(pipelineId!),
    enabled: !!pipelineId,
  });
}

export function useDealAnalytics(pipelineId: string | null) {
  return useQuery({
    queryKey: dealKeys.analytics(pipelineId!),
    queryFn: () => dealsApi.getAnalytics(pipelineId!),
    enabled: !!pipelineId,
  });
}

export function useCreatePipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePipelineRequest) => dealsApi.createPipeline(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dealKeys.all }); toast.success("Pipeline created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create pipeline"),
  });
}

export function useCreateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDealRequest) =>
      dealsApi.createDeal(data.pipelineId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dealKeys.all }); toast.success("Deal created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create deal"),
  });
}

export function useUpdateDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, dealId, ...data }: UpdateDealRequest & { pipelineId: string; dealId: string }) =>
      dealsApi.updateDeal(pipelineId, dealId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dealKeys.all }); toast.success("Deal updated"); },
    onError: (err: Error) => toast.error(err.message || "Failed to update deal"),
  });
}

export function useMoveDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, dealId, ...data }: MoveDealRequest & { pipelineId: string; dealId: string }) =>
      dealsApi.moveDeal(pipelineId, dealId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: dealKeys.all }),
    onError: (err: Error) => toast.error(err.message || "Failed to move deal"),
  });
}

export function useContactDeals(contactId: string | null) {
  return useQuery({
    queryKey: dealKeys.byContact(contactId!),
    queryFn: () => dealsApi.listDealsByContact(contactId!),
    enabled: !!contactId,
  });
}

export function useFollowUps(scope: "due" | "upcoming" = "due") {
  return useQuery({
    queryKey: dealKeys.followUps(scope),
    queryFn: () => dealsApi.listFollowUps(scope),
    refetchInterval: 5 * 60_000,
  });
}

/** Set (ISO time) or clear (null = done) a deal's next follow-up. */
export function useSetFollowUp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, dealId, nextFollowUpAt, followUpNote }: {
      pipelineId: string;
      dealId: string;
      nextFollowUpAt: string | null;
      followUpNote?: string | null;
    }) => dealsApi.updateDeal(pipelineId, dealId, { nextFollowUpAt, followUpNote }),
    onSuccess: (_deal, vars) => {
      qc.invalidateQueries({ queryKey: dealKeys.all });
      toast.success(vars.nextFollowUpAt ? "Follow-up scheduled" : "Follow-up done");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update follow-up"),
  });
}

export function useDealGuard(pipelineId: string | null, dealId: string | null) {
  return useQuery({
    queryKey: dealKeys.guard(dealId ?? ""),
    queryFn: () => dealsApi.getGuard(pipelineId!, dealId!),
    enabled: !!pipelineId && !!dealId,
    refetchInterval: 2 * 60_000,
  });
}

function useScopeMutation<TVars extends { pipelineId: string; dealId: string }>(
  fn: (vars: TVars) => Promise<DealGuard>,
  successMessage?: string,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (guard) => {
      qc.setQueryData(dealKeys.guard(guard.dealId), guard);
      if (successMessage) toast.success(successMessage);
    },
    onError: (err: Error & { response?: { data?: { message?: string } } }) =>
      toast.error(err.response?.data?.message || err.message || "Something went wrong"),
  });
}

export function useDraftScope() {
  return useScopeMutation(({ pipelineId, dealId }) => dealsApi.draftScope(pipelineId, dealId));
}

export function useSaveScope() {
  return useScopeMutation(
    ({ pipelineId, dealId, summary }: { pipelineId: string; dealId: string; summary: string }) =>
      dealsApi.saveScope(pipelineId, dealId, summary),
    "Scope saved",
  );
}

export function useSendScope() {
  return useScopeMutation(
    ({ pipelineId, dealId }) => dealsApi.sendScope(pipelineId, dealId),
    "Scope sent with an approval poll",
  );
}

export function useDeleteDeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ pipelineId, dealId }: { pipelineId: string; dealId: string }) =>
      dealsApi.deleteDeal(pipelineId, dealId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: dealKeys.all }); toast.success("Deal deleted"); },
    onError: (err: Error) => toast.error(err.message || "Failed to delete deal"),
  });
}
