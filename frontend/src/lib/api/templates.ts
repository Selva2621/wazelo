import apiClient from "./client";
import type {
  MessageTemplate,
  SendTemplateRequest,
  CreateTemplateRequest,
  UpdateTemplateRequest,
} from "@/lib/types/templates";

export const templatesApi = {
  list: (status?: string) =>
    apiClient
      .get<MessageTemplate[]>("/messaging/templates", {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<MessageTemplate>(`/messaging/templates/${id}`).then((r) => r.data),

  sync: (channelId: string) =>
    apiClient
      .post<{ synced: number }>("/messaging/templates/sync", { channelId })
      .then((r) => r.data),

  send: (data: SendTemplateRequest) =>
    apiClient.post("/messaging/templates/send", data).then((r) => r.data),

  create: (data: CreateTemplateRequest) =>
    apiClient.post<MessageTemplate>("/messaging/templates", data).then((r) => r.data),

  update: (id: string, data: UpdateTemplateRequest) =>
    apiClient.put<MessageTemplate>(`/messaging/templates/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/messaging/templates/${id}`).then((r) => r.data),

  generate: (data: { prompt: string; category?: string; language?: string }) =>
    apiClient
      .post<{ name: string; body: string }>("/messaging/templates/generate", data)
      .then((r) => r.data),
};
