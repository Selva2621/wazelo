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
  /** Size after compression */
  size: number;
  /** Size of the file as picked */
  originalSize?: number;
  /** Images and videos are shrunk on the server */
  compressed?: boolean;
}

export const uploadApi = {
  /** onProgress gets 0-100 for the transfer; compression runs after it reaches 100 */
  uploadFile: (file: File, onProgress?: (pct: number) => void) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post<UploadResponse>("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        // Videos are re-encoded server-side, which can take a few minutes
        timeout: file.type.startsWith("video/") ? 5 * 60_000 : 90_000,
        onUploadProgress: (e) => {
          if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
        },
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
