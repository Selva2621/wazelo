"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { campaignsApi } from "@/lib/api/campaigns";
import type {
  ListCampaignsParams,
  ListRecipientsParams,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  ScheduleCampaignRequest,
} from "@/lib/types/campaigns";

// ─── Query Key Factory ───

export const campaignKeys = {
  all: ["campaigns"] as const,
  list: (params?: ListCampaignsParams) =>
    ["campaigns", "list", params] as const,
  detail: (campaignId: string) => ["campaigns", campaignId] as const,
  analytics: (campaignId: string) =>
    ["campaigns", campaignId, "analytics"] as const,
  recipients: (campaignId: string, params?: ListRecipientsParams) =>
    ["campaigns", campaignId, "recipients", params] as const,
};

// ─── Query Hooks ───

export function useCampaigns(params?: ListCampaignsParams) {
  return useQuery({
    queryKey: campaignKeys.list(params),
    queryFn: () => campaignsApi.list(params),
  });
}

export function useCampaign(campaignId: string | null) {
  return useQuery({
    queryKey: campaignKeys.detail(campaignId!),
    queryFn: () => campaignsApi.get(campaignId!),
    enabled: !!campaignId,
  });
}

export function useCampaignAnalytics(campaignId: string | null) {
  return useQuery({
    queryKey: campaignKeys.analytics(campaignId!),
    queryFn: () => campaignsApi.getAnalytics(campaignId!),
    enabled: !!campaignId,
  });
}

export function useCampaignRecipients(
  campaignId: string | null,
  params?: ListRecipientsParams,
) {
  return useQuery({
    queryKey: campaignKeys.recipients(campaignId!, params),
    queryFn: () => campaignsApi.listRecipients(campaignId!, params),
    enabled: !!campaignId,
  });
}

// ─── Mutation Hooks ───

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCampaignRequest) => campaignsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: campaignKeys.all }); toast.success("Campaign created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create campaign"),
  });
}

export function useUpdateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      ...data
    }: { campaignId: string } & UpdateCampaignRequest) =>
      campaignsApi.update(campaignId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
      toast.success("Campaign updated");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to update campaign"),
  });
}

export function useExecuteCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => campaignsApi.execute(campaignId),
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      toast.success("Campaign started");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to start campaign"),
  });
}

export function useScheduleCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      campaignId,
      ...data
    }: { campaignId: string } & ScheduleCampaignRequest) =>
      campaignsApi.schedule(campaignId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(variables.campaignId) });
      toast.success("Campaign scheduled");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to schedule campaign"),
  });
}

export function usePauseCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => campaignsApi.pause(campaignId),
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      toast.success("Campaign paused");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to pause campaign"),
  });
}

export function useResumeCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => campaignsApi.resume(campaignId),
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      toast.success("Campaign resumed");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to resume campaign"),
  });
}

export function useCancelCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (campaignId: string) => campaignsApi.cancel(campaignId),
    onSuccess: (_data, campaignId) => {
      queryClient.invalidateQueries({ queryKey: campaignKeys.all });
      queryClient.invalidateQueries({ queryKey: campaignKeys.detail(campaignId) });
      toast.success("Campaign cancelled");
    },
    onError: (err: Error) => toast.error(err.message || "Failed to cancel campaign"),
  });
}

export function usePreviewAudience() {
  return useMutation({
    mutationFn: (data: {
      audienceType: string;
      audienceFilters?: Record<string, unknown>;
    }) => campaignsApi.previewAudience(data),
  });
}
