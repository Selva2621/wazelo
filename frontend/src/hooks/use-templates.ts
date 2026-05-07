"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { templatesApi } from "@/lib/api/templates";
import type { SendTemplateRequest, CreateTemplateRequest, UpdateTemplateRequest } from "@/lib/types/templates";

export const templateKeys = {
  all: ["templates"] as const,
  list: (status?: string) => ["templates", "list", status] as const,
  detail: (id: string) => ["templates", id] as const,
};

export function useTemplates(status?: string) {
  return useQuery({
    queryKey: templateKeys.list(status),
    queryFn: () => templatesApi.list(status),
    staleTime: 60_000,
  });
}

export function useTemplate(id: string) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templatesApi.getById(id),
    staleTime: 60_000,
    enabled: !!id,
  });
}

export function useSyncTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (channelId: string) => templatesApi.sync(channelId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: templateKeys.all });
      toast.success(`Templates synced${data?.synced != null ? ` (${data.synced} updated)` : ""}`);
    },
    onError: (err: Error) => toast.error(err.message || "Failed to sync templates"),
  });
}

export function useSendTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: SendTemplateRequest) => templatesApi.send(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateRequest) => templatesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: templateKeys.all }); toast.success("Template created"); },
    onError: (err: Error) => toast.error(err.message || "Failed to create template"),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & UpdateTemplateRequest) =>
      templatesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: templateKeys.all }); toast.success("Template updated"); },
    onError: (err: Error) => toast.error(err.message || "Failed to update template"),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => templatesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: templateKeys.all }); toast.success("Template deleted"); },
    onError: (err: Error) => toast.error(err.message || "Failed to delete template"),
  });
}

export function useGenerateTemplate() {
  return useMutation({
    mutationFn: (data: { prompt: string; category?: string; language?: string }) =>
      templatesApi.generate(data),
  });
}
