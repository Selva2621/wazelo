import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getDeveloperDashboard,
  getDeveloperLogs,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
} from "@/lib/api/developer";
import type { CreateApiKeyRequest } from "@/lib/types/developer";

export function useDeveloperDashboard() {
  return useQuery({
    queryKey: ["developer", "dashboard"],
    queryFn: getDeveloperDashboard,
  });
}

export function useDeveloperLogs(limit = 20, cursor?: string) {
  return useQuery({
    queryKey: ["developer", "logs", limit, cursor],
    queryFn: () => getDeveloperLogs(limit, cursor),
  });
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["developer", "api-keys"],
    queryFn: listApiKeys,
  });
}

export function useCreateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateApiKeyRequest) => createApiKey(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["developer", "api-keys"] }),
  });
}

export function useRevokeApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => revokeApiKey(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["developer", "api-keys"] }),
  });
}

export function useRotateApiKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rotateApiKey(id),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["developer", "api-keys"] });
      return result;
    },
  });
}
