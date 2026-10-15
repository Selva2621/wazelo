import apiClient from "./client";
import type {
  ScrapeRun,
  ScrapeRunsResponse,
  ScrapeResultsResponse,
  ImportScrapeResultsRequest,
  ImportScrapeResultsResponse,
  TriggerScrapeRequest,
  ListScrapeRunsParams,
  WaCheckState,
} from "@/lib/types/lead-scraper";

export interface CheckWhatsAppResult {
  phone: string;
  exists: boolean | null;
  reason?: "no_session" | "rate_limited";
  /** Served from the server-side cache — no WhatsApp lookup was made */
  cached?: boolean;
}

export const leadScraperApi = {
  triggerRun: (data: TriggerScrapeRequest): Promise<ScrapeRun> =>
    apiClient.post<ScrapeRun>("/lead-scraper/runs", data).then((r) => r.data),

  listRuns: (params?: ListScrapeRunsParams): Promise<ScrapeRunsResponse> =>
    apiClient.get<ScrapeRunsResponse>("/lead-scraper/runs", { params }).then((r) => r.data),

  getRun: (id: string): Promise<ScrapeRun> =>
    apiClient.get<ScrapeRun>(`/lead-scraper/runs/${id}`).then((r) => r.data),

  getRunResults: (id: string): Promise<ScrapeResultsResponse> =>
    // A run holds at most 200 results — fetch them all so client-side filters see every row
    apiClient
      .get<ScrapeResultsResponse>(`/lead-scraper/runs/${id}/results`, { params: { take: 200 } })
      .then((r) => r.data),

  startWhatsAppCheck: (id: string, resultIds?: string[]): Promise<WaCheckState> =>
    apiClient.post<WaCheckState>(`/lead-scraper/runs/${id}/wa-check`, { resultIds }).then((r) => r.data),

  stopWhatsAppCheck: (id: string): Promise<{ success: boolean }> =>
    apiClient.post<{ success: boolean }>(`/lead-scraper/runs/${id}/wa-check/stop`).then((r) => r.data),

  cancelRun: (id: string): Promise<{ success: boolean }> =>
    apiClient.post<{ success: boolean }>(`/lead-scraper/runs/${id}/cancel`).then((r) => r.data),

  importResults: (id: string, data: ImportScrapeResultsRequest): Promise<ImportScrapeResultsResponse> =>
    apiClient.post<ImportScrapeResultsResponse>(`/lead-scraper/runs/${id}/import`, data).then((r) => r.data),

  checkWhatsApp: (phone: string): Promise<CheckWhatsAppResult> =>
    apiClient.get<CheckWhatsAppResult>("/lead-scraper/check-whatsapp", { params: { phone } }).then((r) => r.data),

  deleteRun: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete<{ success: boolean }>(`/lead-scraper/runs/${id}`).then((r) => r.data),

  reRun: (id: string): Promise<ScrapeRun> =>
    apiClient.post<ScrapeRun>(`/lead-scraper/runs/${id}/re-run`).then((r) => r.data),
};
