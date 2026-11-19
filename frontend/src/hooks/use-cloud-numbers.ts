"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cloudNumbersApi, type ConnectCloudNumberPayload } from "@/lib/api/whatsapp";
import { ApiError } from "@/lib/api/client";

const KEY = ["whatsapp", "cloud-numbers"] as const;

/** Readable message from an API error (the client turns errors into ApiError with the server's message) */
export function apiError(err: unknown, fallback: string): string {
  if (err instanceof ApiError && err.message) return err.message;
  const msg = (err as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
  return Array.isArray(msg) ? msg[0] : msg || (err instanceof Error && err.message) || fallback;
}

export function useCloudNumbers(enabled = true) {
  return useQuery({ queryKey: KEY, queryFn: cloudNumbersApi.list, staleTime: 30_000, enabled });
}

/** Official numbers also show up in every "Send from" list, so refresh those too */
function useInvalidate() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["whatsapp", "admin", "sessions"] });
  };
}

export function useConnectCloudNumber() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (payload: ConnectCloudNumberPayload) => cloudNumbersApi.connect(payload),
    onSuccess: invalidate,
  });
}

export function useRefreshCloudNumber() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cloudNumbersApi.refresh(id),
    onSuccess: () => { invalidate(); toast.success("Updated from Meta"); },
    onError: (err) => toast.error(apiError(err, "Couldn't reach Meta")),
  });
}

export function useUpdateCloudCredentials() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; accessToken?: string; appSecret?: string }) =>
      cloudNumbersApi.updateCredentials(id, payload),
    onSuccess: invalidate,
  });
}

/** Approved Meta templates (all official numbers when no session given) */
export function useCloudTemplates(sessionId?: string, enabled = true) {
  return useQuery({
    queryKey: [...KEY, "templates", sessionId ?? "all"],
    queryFn: () => cloudNumbersApi.listTemplates(sessionId),
    staleTime: 60_000,
    enabled,
  });
}

export function useSyncCloudTemplates() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cloudNumbersApi.syncTemplates(id),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: [...KEY, "templates"] });
      toast.success(`${r.approved} approved template${r.approved === 1 ? "" : "s"} ready`);
    },
    onError: (err) => toast.error(apiError(err, "Couldn't sync templates")),
  });
}

export function useRemoveCloudNumber() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (id: string) => cloudNumbersApi.remove(id),
    onSuccess: () => { invalidate(); toast.success("Official number removed"); },
    onError: (err) => toast.error(apiError(err, "Couldn't remove the number")),
  });
}
