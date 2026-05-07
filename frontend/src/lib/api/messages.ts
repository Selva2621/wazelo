import apiClient from "./client";
import type {
  MessageResponse,
  MessagesListResponse,
  MessageEventResponse,
  SendMessageRequest,
  ListMessagesParams,
} from "@/lib/types/inbox";

export interface UploadResponse {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
}

export const uploadApi = {
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post<UploadResponse>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      })
      .then((r) => r.data);
  },
};

export const messagesApi = {
  send: (data: SendMessageRequest) =>
    apiClient
      .post<MessageResponse>("/messaging/messages", data)
      .then((r) => r.data),

  list: (params: ListMessagesParams) =>
    apiClient
      .get<MessagesListResponse>("/messaging/messages", { params })
      .then((r) => r.data),

  getById: (messageId: string) =>
    apiClient
      .get<MessageResponse>(`/messaging/messages/${messageId}`)
      .then((r) => r.data),

  getEvents: (messageId: string) =>
    apiClient
      .get<MessageEventResponse[]>(`/messaging/messages/${messageId}/events`)
      .then((r) => r.data),
};
