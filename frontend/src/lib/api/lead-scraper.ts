import apiClient from "./client";
import type {
  ScrapeRun,
  ScrapeRunsResponse,
  ScrapeResultsResponse,
  ImportScrapeResultsRequest,
  ImportScrapeResultsResponse,
  TriggerScrapeRequest,
  ListScrapeRunsParams,
} from "@/lib/types/lead-scraper";

export interface CheckWhatsAppResult {
  phone: string;
  exists: boolean | null;
  reason?: string;
}

export const leadScraperApi = {
  triggerRun: (data: TriggerScrapeRequest): Promise<ScrapeRun> =>
    apiClient.post<ScrapeRun>("/lead-scraper/runs", data).then((r) => r.data),

  listRuns: (params?: ListScrapeRunsParams): Promise<ScrapeRunsResponse> =>
    apiClient.get<ScrapeRunsResponse>("/lead-scraper/runs", { params }).then((r) => r.data),

  getRun: (id: string): Promise<ScrapeRun> =>
    apiClient.get<ScrapeRun>(`/lead-scraper/runs/${id}`).then((r) => r.data),

  getRunResults: (id: string): Promise<ScrapeResultsResponse> =>
    apiClient.get<ScrapeResultsResponse>(`/lead-scraper/runs/${id}/results`).then((r) => r.data),

  importResults: (id: string, data: ImportScrapeResultsRequest): Promise<ImportScrapeResultsResponse> =>
    apiClient.post<ImportScrapeResultsResponse>(`/lead-scraper/runs/${id}/import`, data).then((r) => r.data),

  checkWhatsApp: (phone: string): Promise<CheckWhatsAppResult> =>
    apiClient.get<CheckWhatsAppResult>("/lead-scraper/check-whatsapp", { params: { phone } }).then((r) => r.data),

  deleteRun: (id: string): Promise<{ success: boolean }> =>
    apiClient.delete<{ success: boolean }>(`/lead-scraper/runs/${id}`).then((r) => r.data),

  reRun: (id: string): Promise<ScrapeRun> =>
    apiClient.post<ScrapeRun>(`/lead-scraper/runs/${id}/re-run`).then((r) => r.data),
};
