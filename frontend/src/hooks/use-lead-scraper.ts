"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

/** Spacing between live lookups — matches the backend cap of 10 per minute. */
const WA_CHECK_GAP_MS = 6_500;

/**
 * "Is this number on WhatsApp?" checks, run only when the user asks and one at
 * a time. Firing them all at once is a classic way to get a WhatsApp number banned.
 */
export function useWhatsAppChecks(phones: string[]) {
  const queryClient = useQueryClient();
  const [statusMap, setStatusMap] = useState<Record<string, CheckWhatsAppResult>>({});
  const [isChecking, setIsChecking] = useState(false);
  const cancelledRef = useRef(false);
  const phonesKey = phones.join(",");

  // Show results already checked earlier in this browser session
  useEffect(() => {
    const cached: Record<string, CheckWhatsAppResult> = {};
    for (const phone of phonesKey ? phonesKey.split(",") : []) {
      const hit = queryClient.getQueryData<CheckWhatsAppResult>(["whatsapp-check", phone]);
      if (hit) cached[phone] = hit;
    }
    setStatusMap(cached);
  }, [phonesKey, queryClient]);

  useEffect(() => () => { cancelledRef.current = true; }, []);

  const checkPhones = useCallback(async (targets: string[]) => {
    cancelledRef.current = false;
    setIsChecking(true);
    try {
      for (const phone of targets) {
        if (cancelledRef.current) break;
        const known = queryClient.getQueryData<CheckWhatsAppResult>(["whatsapp-check", phone]);
        if (known && known.exists !== null) continue;

        const result = await leadScraperApi.checkWhatsApp(phone);
        if (result.reason === "rate_limited") {
          toast.info("WhatsApp check limit reached — continue in a minute. This protects your number from a ban.");
          break;
        }
        if (result.reason === "no_session") {
          toast.error("Connect WhatsApp first to check numbers.");
          break;
        }

        queryClient.setQueryData(["whatsapp-check", phone], result);
        setStatusMap((prev) => ({ ...prev, [phone]: result }));
        if (!result.cached) await new Promise((r) => setTimeout(r, WA_CHECK_GAP_MS));
      }
    } catch {
      toast.error("WhatsApp check failed");
    } finally {
      setIsChecking(false);
    }
  }, [queryClient]);

  const stopChecking = useCallback(() => {
    cancelledRef.current = true;
  }, []);

  return { statusMap, isLoading: isChecking, isChecking, checkPhones, stopChecking };
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
      if (data.noPhone) {
        toast.info(`${data.noPhone} lead${data.noPhone !== 1 ? "s have" : " has"} no phone number — open the job link to bid instead.`);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Failed to import contacts");
    },
  });
}
