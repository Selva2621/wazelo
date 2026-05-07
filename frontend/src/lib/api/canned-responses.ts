import apiClient from "./client";
import type {
  CannedResponse,
  CreateCannedResponseRequest,
  UpdateCannedResponseRequest,
} from "@/lib/types/canned-responses";

export const cannedResponsesApi = {
  list: (category?: string) =>
    apiClient
      .get<CannedResponse[]>("/messaging/canned-responses", {
        params: category ? { category } : undefined,
      })
      .then((r) => r.data),

  create: (data: CreateCannedResponseRequest) =>
    apiClient
      .post<CannedResponse>("/messaging/canned-responses", data)
      .then((r) => r.data),

  update: (id: string, data: UpdateCannedResponseRequest) =>
    apiClient
      .put<CannedResponse>(`/messaging/canned-responses/${id}`, data)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/messaging/canned-responses/${id}`).then((r) => r.data),

  recordUsage: (id: string) =>
    apiClient
      .post(`/messaging/canned-responses/${id}/use`)
      .then((r) => r.data),
};
