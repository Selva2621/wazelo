import apiClient from "./client";
import type {
  SlaPolicy,
  CreateSlaPolicyRequest,
  UpdateSlaPolicyRequest,
  SlaTrackingsResponse,
  SlaBreachesResponse,
  SlaBreachLog,
  SlaPerformanceResponse,
  ListSlaPoliciesParams,
  ListSlaTrackingsParams,
  ListSlaBreachesParams,
  SlaPerformanceParams,
} from "@/lib/types/sla";

export const slaApi = {
  // ─── Policies ───

  listPolicies: (params?: ListSlaPoliciesParams) =>
    apiClient
      .get<SlaPolicy[]>("/sla/policies", { params })
      .then((r) => r.data),

  getPolicy: (id: string) =>
    apiClient.get<SlaPolicy>(`/sla/policies/${id}`).then((r) => r.data),

  createPolicy: (data: CreateSlaPolicyRequest) =>
    apiClient.post<SlaPolicy>("/sla/policies", data).then((r) => r.data),

  updatePolicy: (id: string, data: UpdateSlaPolicyRequest) =>
    apiClient.patch<SlaPolicy>(`/sla/policies/${id}`, data).then((r) => r.data),

  deletePolicy: (id: string) =>
    apiClient.delete(`/sla/policies/${id}`).then((r) => r.data),

  // ─── Trackings ───

  listTrackings: (params?: ListSlaTrackingsParams) =>
    apiClient
      .get<SlaTrackingsResponse>("/sla/trackings", { params })
      .then((r) => r.data),

  // ─── Breaches ───

  listBreaches: (params?: ListSlaBreachesParams) =>
    apiClient
      .get<SlaBreachesResponse>("/sla/breaches", { params })
      .then((r) => r.data),

  acknowledgeBreach: (id: string) =>
    apiClient
      .post<SlaBreachLog>(`/sla/breaches/${id}/acknowledge`)
      .then((r) => r.data),

  // ─── Performance ───

  getPerformance: (params?: SlaPerformanceParams) =>
    apiClient
      .get<SlaPerformanceResponse>("/sla/performance", { params })
      .then((r) => r.data),
};
