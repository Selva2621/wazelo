"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { channelsApi } from "@/lib/api/channels";
import type {
  ListChannelsParams,
  CreateChannelRequest,
  UpdateChannelRequest,
  SuspendChannelRequest,
} from "@/lib/types/channels";

// ─── Query Key Factory ───

export const channelKeys = {
  all: ["channels"] as const,
  list: (params?: ListChannelsParams) =>
    ["channels", "list", params] as const,
  detail: (id: string) => ["channels", id] as const,
  capabilities: (id: string) => ["channels", id, "capabilities"] as const,
};

// ─── Query Hooks ───

export function useChannels(params?: ListChannelsParams) {
  return useQuery({
    queryKey: channelKeys.list(params),
    queryFn: () => channelsApi.list(params),
    staleTime: 60_000,
  });
}

export function useChannel(id: string) {
  return useQuery({
    queryKey: channelKeys.detail(id),
    queryFn: () => channelsApi.getById(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useChannelCapabilities(id: string) {
  return useQuery({
    queryKey: channelKeys.capabilities(id),
    queryFn: () => channelsApi.getCapabilities(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

// ─── Mutation Hooks ───

export function useCreateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateChannelRequest) => channelsApi.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: channelKeys.all }); toast.success("Channel created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create channel"),
  });
}

export function useUpdateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateChannelRequest }) =>
      channelsApi.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: channelKeys.all }); toast.success("Channel updated"); },
    onError: (err: Error) => toast.error(err.message || "Failed to update channel"),
  });
}

export function useSuspendChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: SuspendChannelRequest }) =>
      channelsApi.suspend(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: channelKeys.all }); toast.success("Channel suspended"); },
    onError: (err: Error) => toast.error(err.message || "Failed to suspend channel"),
  });
}

export function useReactivateChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => channelsApi.reactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: channelKeys.all }); toast.success("Channel reactivated"); },
    onError: (err: Error) => toast.error(err.message || "Failed to reactivate channel"),
  });
}

export function useDeleteChannel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => channelsApi.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: channelKeys.all }); toast.success("Channel deleted"); },
    onError: (err: Error) => toast.error(err.message || "Failed to delete channel"),
  });
}
