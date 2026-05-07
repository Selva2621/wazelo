import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSequences,
  getSequence,
  createSequence,
  deleteSequence,
  startSequence,
  pauseSequence,
  resumeSequence,
  cancelSequence,
  getSequenceRecipients,
  getSequenceAnalytics,
} from "@/lib/api/sequences";
import type { CreateSequenceRequest, SequenceStatus } from "@/lib/types/sequences";

export function useSequences(params?: { status?: SequenceStatus; take?: number; skip?: number }) {
  return useQuery({
    queryKey: ["sequences", params],
    queryFn: () => listSequences(params),
  });
}

export function useSequence(id: string | undefined) {
  return useQuery({
    queryKey: ["sequences", id],
    queryFn: () => getSequence(id!),
    enabled: !!id,
  });
}

export function useCreateSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateSequenceRequest) => createSequence(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useDeleteSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useStartSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => startSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function usePauseSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pauseSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useResumeSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => resumeSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useCancelSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelSequence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sequences"] }),
  });
}

export function useSequenceRecipients(id: string | undefined, take = 50, skip = 0) {
  return useQuery({
    queryKey: ["sequences", id, "recipients", take, skip],
    queryFn: () => getSequenceRecipients(id!, take, skip),
    enabled: !!id,
  });
}

// Analytics
export function useSequenceAnalytics(id: string | undefined) {
  return useQuery({
    queryKey: ["sequences", id, "analytics"],
    queryFn: () => getSequenceAnalytics(id!),
    enabled: !!id,
  });
}
