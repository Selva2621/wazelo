"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { proposalsApi, type ProposalEdits, type ProposalStatus } from "@/lib/api/proposals";

export const proposalKeys = {
  all: ["proposals"] as const,
  list: (params?: object) => ["proposals", "list", params ?? {}] as const,
  one: (id: string) => ["proposals", "one", id] as const,
};

export function useProposals(params?: { contactId?: string; dealId?: string; status?: ProposalStatus }) {
  return useQuery({ queryKey: proposalKeys.list(params), queryFn: () => proposalsApi.list(params) });
}

export function useProposal(id: string | undefined) {
  return useQuery({ queryKey: proposalKeys.one(id ?? ""), queryFn: () => proposalsApi.get(id!), enabled: !!id });
}

export function useCreateProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: proposalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalKeys.all }),
  });
}

/** Every save/draft/send returns the full proposal: put it straight into the cache. */
function useProposalMutation<V>(fn: (v: V) => ReturnType<typeof proposalsApi.get>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (p) => {
      qc.setQueryData(proposalKeys.one(p.id), p);
      qc.invalidateQueries({ queryKey: ["proposals", "list"] });
    },
  });
}

export const useUpdateProposal = () =>
  useProposalMutation(({ id, ...data }: { id: string } & ProposalEdits) => proposalsApi.update(id, data));
export const useDraftProposal = () => useProposalMutation((id: string) => proposalsApi.draft(id));
export const useSendProposal = () => useProposalMutation((id: string) => proposalsApi.send(id));
export const useShareProposal = () => useProposalMutation((id: string) => proposalsApi.share(id));

export function useImproveSection() {
  return useMutation({
    mutationFn: ({ id, section, text }: { id: string; section: "intro" | "scope" | "terms"; text: string }) =>
      proposalsApi.improve(id, section, text),
  });
}

export function useDeleteProposal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: proposalsApi.remove,
    onSuccess: () => qc.invalidateQueries({ queryKey: proposalKeys.all }),
  });
}
