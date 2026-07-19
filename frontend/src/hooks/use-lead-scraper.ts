"use client";

import { useQuery, useMutation, useQueryClient, useQueries } from "@tanstack/react-query";
import { toast } from "sonner";
import { leadScraperApi } from "@/lib/api/lead-scraper";
import type { CheckWhatsAppResult } from "@/lib/api/lead-scraper";
import type { ListScrapeRunsParams } from "@/lib/types/lead-scraper";

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

export function useScrapeRunResults(runId: string | null) {
  return useQuery({
    queryKey: scrapeRunKeys.results(runId ?? ""),
    queryFn: () => leadScraperApi.getRunResults(runId!),
    enabled: Boolean(runId),
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

export function useWhatsAppChecks(phones: string[]) {
  const results = useQueries({
    queries: phones.map((phone) => ({
      queryKey: ["whatsapp-check", phone] as const,
      queryFn: () => leadScraperApi.checkWhatsApp(phone),
      staleTime: 5 * 60 * 1000, // cache for 5 min
      retry: false,
    })),
  });

  const statusMap: Record<string, CheckWhatsAppResult> = {};
  phones.forEach((phone, i) => {
    if (results[i].data) {
      statusMap[phone] = results[i].data!;
    }
  });

  return { statusMap, isLoading: results.some((r) => r.isLoading) };
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
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to import contacts");
    },
  });
}
