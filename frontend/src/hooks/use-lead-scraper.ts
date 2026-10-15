"use client";

import { useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { leadScraperApi } from "@/lib/api/lead-scraper";
import type { CheckWhatsAppResult } from "@/lib/api/lead-scraper";
import type { ListScrapeRunsParams, ScrapeResult, WaCheckState } from "@/lib/types/lead-scraper";

export const scrapeRunKeys = {
  all: ["scrape-runs"] as const,
  list: (params?: ListScrapeRunsParams) => ["scrape-runs", "list", params] as const,
  detail: (id: string) => ["scrape-runs", id] as const,
  results: (id: string) => ["scrape-runs", id, "results"] as const,
};

export function useScrapeRuns(params?: ListScrapeRunsParams, refetchInterval?: number) {
  return useQuery({
    queryKey: scrapeRunKeys.list(params),
    queryFn: () => leadScraperApi.listRuns(params),
    refetchInterval,
  });
}

export function useScrapeRunResults(runId: string | null, refetchInterval?: number | false) {
  return useQuery({
    queryKey: scrapeRunKeys.results(runId ?? ""),
    queryFn: () => leadScraperApi.getRunResults(runId!),
    enabled: Boolean(runId),
    refetchInterval,
  });
}

export function useTriggerScrapeRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof leadScraperApi.triggerRun>[0]) =>
      leadScraperApi.triggerRun(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.all });
      toast.success("Scraper started! Results will appear shortly.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to start scraper");
    },
  });
}

const WA_CHECK_END_MESSAGES: Partial<Record<WaCheckState["state"], () => void>> = {
  done: () => toast.success("WhatsApp check finished."),
  day_limit: () => toast.info("Daily WhatsApp check limit reached — continue tomorrow. This protects your number from a ban."),
  no_session: () => toast.error("WhatsApp disconnected — reconnect to continue checking."),
};

/**
 * "Is this number on WhatsApp?" checks run on the server, one number at a time
 * within WhatsApp-safe limits — firing them all at once is a classic way to get
 * a number banned. Answers are stored on the results, so they survive reloads.
 */
export function useWhatsAppChecks(runId: string, waCheck: WaCheckState | null | undefined, results: ScrapeResult[]) {
  const queryClient = useQueryClient();
  const isChecking = waCheck?.state === "running";

  const statusMap = useMemo(() => {
    const map: Record<string, CheckWhatsAppResult> = {};
    for (const r of results) {
      if (r.phone && r.waCheckedAt) map[r.phone] = { phone: r.phone, exists: r.waExists ?? null };
    }
    return map;
  }, [results]);

  // Tell the user once when a check they watched ends
  const prevState = useRef(waCheck?.state);
  useEffect(() => {
    if (prevState.current === "running" && waCheck?.state && waCheck.state !== "running") {
      WA_CHECK_END_MESSAGES[waCheck.state]?.();
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.results(runId) });
    }
    prevState.current = waCheck?.state;
  }, [waCheck?.state, runId, queryClient]);

  const start = useMutation({
    mutationFn: (resultIds: string[]) => leadScraperApi.startWhatsAppCheck(runId, resultIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scrapeRunKeys.detail(runId) }),
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? "Could not start WhatsApp check");
    },
  });

  const stop = useMutation({
    mutationFn: () => leadScraperApi.stopWhatsAppCheck(runId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: scrapeRunKeys.detail(runId) }),
  });

  return {
    statusMap,
    isChecking: isChecking || start.isPending,
    checkPhones: (resultIds: string[]) => start.mutate(resultIds),
    stopChecking: () => stop.mutate(),
  };
}

export function useDeleteScrapeRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadScraperApi.deleteRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.all });
      toast.success("Run deleted.");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to delete run");
    },
  });
}

export function useCancelScrapeRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadScraperApi.cancelRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.all });
      toast.success("Run cancelled.");
    },
    onError: (err: { response?: { data?: { message?: string } } }) => {
      toast.error(err?.response?.data?.message ?? "Failed to cancel run");
    },
  });
}

export function useReRunScrape() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => leadScraperApi.reRun(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.all });
      toast.success("Scraper re-started!");
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to re-run");
    },
  });
}

export function useImportScrapeResults(runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resultIds: string[]) =>
      leadScraperApi.importResults(runId, { resultIds }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.results(runId) });
      queryClient.invalidateQueries({ queryKey: scrapeRunKeys.all });
      toast.success(`Imported ${data.imported} contact${data.imported !== 1 ? "s" : ""}${data.skipped ? `, ${data.skipped} skipped` : ""}.`);
      if (data.noPhone) {
        toast.info(`${data.noPhone} lead${data.noPhone !== 1 ? "s have" : " has"} no phone number — open the job link to bid instead.`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to import contacts");
    },
  });
}
