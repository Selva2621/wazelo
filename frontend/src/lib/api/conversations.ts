import apiClient from "./client";
import type {
  ConversationListResponse,
  ListConversationsParams,
} from "@/lib/types/inbox";

export const conversationsApi = {
  list: (params?: ListConversationsParams) =>
    apiClient
      .get<ConversationListResponse>("/messaging/conversations", { params })
      .then((r) => r.data),

  markAsRead: (conversationId: string) =>
    apiClient
      .post(`/messaging/conversations/${conversationId}/read`)
      .then((r) => r.data),

  delete: (conversationId: string) =>
    apiClient
      .delete(`/messaging/conversations/${conversationId}`)
      .then((r) => r.data),

  close: (conversationId: string) =>
    apiClient
      .post(`/messaging/conversations/${conversationId}/close`)
      .then((r) => r.data),

  archive: (conversationId: string) =>
    apiClient
      .post(`/messaging/conversations/${conversationId}/archive`)
      .then((r) => r.data),

  reopen: (conversationId: string) =>
    apiClient
      .post(`/messaging/conversations/${conversationId}/reopen`)
      .then((r) => r.data),

  assign: (conversationId: string, assignedToId: string | null) =>
    apiClient
      .post(`/messaging/conversations/${conversationId}/assign`, { assignedToId })
      .then((r) => r.data),
};
