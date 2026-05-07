import apiClient from "./client";
import type {
  ScheduledMessage,
  ScheduledMessageListResponse,
  CreateScheduledMessageRequest,
  UpdateScheduledMessageRequest,
  ListScheduledMessagesParams,
} from "@/lib/types/scheduler";

export const schedulerApi = {
  // ─── CRUD ───

  create: (data: CreateScheduledMessageRequest) =>
    apiClient
      .post<ScheduledMessage>("/scheduler/messages", data)
      .then((r) => r.data),

  list: (params?: ListScheduledMessagesParams) =>
    apiClient
      .get<ScheduledMessageListResponse>("/scheduler/messages", { params })
      .then((r) => r.data),

  get: (messageId: string) =>
    apiClient
      .get<ScheduledMessage>(`/scheduler/messages/${messageId}`)
      .then((r) => r.data),

  update: (messageId: string, data: UpdateScheduledMessageRequest) =>
    apiClient
      .patch<ScheduledMessage>(`/scheduler/messages/${messageId}`, data)
      .then((r) => r.data),

  cancel: (messageId: string) =>
    apiClient
      .post<ScheduledMessage>(`/scheduler/messages/${messageId}/cancel`)
      .then((r) => r.data),
};
