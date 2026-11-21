"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { leadFollowUpsApi } from "@/lib/api/lead-follow-ups";

const KEY = ["lead-follow-ups", "mine"] as const;

/** Leads waiting for me; refreshed every minute so the timers and new leads stay current */
export function useMyLeads() {
  return useQuery({ queryKey: KEY, queryFn: leadFollowUpsApi.mine, refetchInterval: 60_000 });
}

export function useMarkLeadCalled() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadFollowUpsApi.called(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Marked as called");
    },
    onError: (err: Error) => toast.error(err.message || "Couldn't mark as called"),
  });
}
