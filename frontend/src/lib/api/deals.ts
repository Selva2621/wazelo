import apiClient from "./client";
import type {
  Pipeline,
  Deal,
  CreatePipelineRequest,
  CreateDealRequest,
  UpdateDealRequest,
  MoveDealRequest,
  DealAnalytics,
  DealFollowUp,
  DealGuard,
} from "@/lib/types/deals";

export const dealsApi = {
  // Pipelines
  listPipelines: () =>
    apiClient.get<Pipeline[]>("/pipelines").then((r) => r.data),

  getPipeline: (id: string) =>
    apiClient.get<Pipeline>(`/pipelines/${id}`).then((r) => r.data),

  createPipeline: (data: CreatePipelineRequest) =>
    apiClient.post<Pipeline>("/pipelines", data).then((r) => r.data),

  updatePipeline: (id: string, data: { name?: string; description?: string }) =>
    apiClient.patch<Pipeline>(`/pipelines/${id}`, data).then((r) => r.data),

  deletePipeline: (id: string) =>
    apiClient.delete(`/pipelines/${id}`).then((r) => r.data),

  // Deals
  listDeals: (pipelineId: string) =>
    apiClient.get<Deal[]>(`/pipelines/${pipelineId}/deals`).then((r) => r.data),

  getDeal: (pipelineId: string, dealId: string) =>
    apiClient.get<Deal>(`/pipelines/${pipelineId}/deals/${dealId}`).then((r) => r.data),

  createDeal: (pipelineId: string, data: CreateDealRequest) =>
    apiClient.post<Deal>(`/pipelines/${pipelineId}/deals`, data).then((r) => r.data),

  updateDeal: (pipelineId: string, dealId: string, data: UpdateDealRequest) =>
    apiClient.patch<Deal>(`/pipelines/${pipelineId}/deals/${dealId}`, data).then((r) => r.data),

  moveDeal: (pipelineId: string, dealId: string, data: MoveDealRequest) =>
    apiClient.post<Deal>(`/pipelines/${pipelineId}/deals/${dealId}/move`, data).then((r) => r.data),

  deleteDeal: (pipelineId: string, dealId: string) =>
    apiClient.delete(`/pipelines/${pipelineId}/deals/${dealId}`).then((r) => r.data),

  // Deals by Contact
  listDealsByContact: (contactId: string) =>
    apiClient.get<Deal[]>(`/pipelines/deals/by-contact/${contactId}`).then((r) => r.data),

  // Follow-ups due (overdue + today), or upcoming (next 7 days)
  listFollowUps: (scope: "due" | "upcoming" = "due") =>
    apiClient
      .get<DealFollowUp[]>("/pipelines/deals/follow-ups", {
        params: { scope, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
      })
      .then((r) => r.data),

  // Deal Guard
  getGuard: (pipelineId: string, dealId: string) =>
    apiClient.get<DealGuard>(`/pipelines/${pipelineId}/deals/${dealId}/guard`).then((r) => r.data),

  draftScope: (pipelineId: string, dealId: string) =>
    apiClient.post<DealGuard>(`/pipelines/${pipelineId}/deals/${dealId}/scope/draft`).then((r) => r.data),

  saveScope: (pipelineId: string, dealId: string, summary: string) =>
    apiClient.patch<DealGuard>(`/pipelines/${pipelineId}/deals/${dealId}/scope`, { summary }).then((r) => r.data),

  sendScope: (pipelineId: string, dealId: string) =>
    apiClient.post<DealGuard>(`/pipelines/${pipelineId}/deals/${dealId}/scope/send`).then((r) => r.data),

  // Analytics
  getAnalytics: (pipelineId: string) =>
    apiClient.get<DealAnalytics>(`/pipelines/${pipelineId}/analytics`).then((r) => r.data),
};
