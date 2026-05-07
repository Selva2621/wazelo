import apiClient from "./client";
import type {
  Pipeline,
  Deal,
  CreatePipelineRequest,
  CreateDealRequest,
  UpdateDealRequest,
  MoveDealRequest,
  DealAnalytics,
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

  // Analytics
  getAnalytics: (pipelineId: string) =>
    apiClient.get<DealAnalytics>(`/pipelines/${pipelineId}/analytics`).then((r) => r.data),
};
