"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cannedResponsesApi } from "@/lib/api/canned-responses";
import type { CreateCannedResponseRequest, UpdateCannedResponseRequest } from "@/lib/types/canned-responses";

export const cannedResponseKeys = {
  all: ["canned-responses"] as const,
  list: (category?: string) => ["canned-responses", "list", category] as const,
};

export function useCannedResponses(category?: string) {
  return useQuery({
    queryKey: cannedResponseKeys.list(category),
    queryFn: () => cannedResponsesApi.list(category),
    staleTime: 60_000,
  });
}

export function useCreateCannedResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCannedResponseRequest) => cannedResponsesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: cannedResponseKeys.all }); },
  });
}

export function useUpdateCannedResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateCannedResponseRequest }) =>
      cannedResponsesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: cannedResponseKeys.all }); },
  });
}

export function useDeleteCannedResponse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cannedResponsesApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: cannedResponseKeys.all }); },
  });
}
