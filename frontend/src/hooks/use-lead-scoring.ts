import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listScoringRules,
  createScoringRule,
  updateScoringRule,
  deleteScoringRule,
  getContactScore,
  setContactScore,
  getScoreHistory,
} from "@/lib/api/lead-scoring";
import type {
  CreateScoringRuleRequest,
  UpdateScoringRuleRequest,
  SetContactScoreRequest,
} from "@/lib/types/lead-scoring";

// ─── Scoring Rules ───

export function useScoringRules() {
  return useQuery({
    queryKey: ["lead-scoring", "rules"],
    queryFn: listScoringRules,
  });
}

export function useCreateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: CreateScoringRuleRequest) => createScoringRule(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-scoring", "rules"] }),
  });
}

export function useUpdateScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...req }: UpdateScoringRuleRequest & { id: string }) =>
      updateScoringRule(id, req),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-scoring", "rules"] }),
  });
}

export function useDeleteScoringRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteScoringRule(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lead-scoring", "rules"] }),
  });
}

// ─── Contact Score ───

export function useContactScore(contactId: string | undefined) {
  return useQuery({
    queryKey: ["lead-scoring", "contact", contactId],
    queryFn: () => getContactScore(contactId!),
    enabled: !!contactId,
  });
}

export function useSetContactScore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ contactId, ...req }: SetContactScoreRequest & { contactId: string }) =>
      setContactScore(contactId, req),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["lead-scoring", "contact", vars.contactId] });
      qc.invalidateQueries({ queryKey: ["lead-scoring", "history", vars.contactId] });
      qc.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useScoreHistory(contactId: string | undefined, take = 20, skip = 0) {
  return useQuery({
    queryKey: ["lead-scoring", "history", contactId, take, skip],
    queryFn: () => getScoreHistory(contactId!, take, skip),
    enabled: !!contactId,
  });
}
