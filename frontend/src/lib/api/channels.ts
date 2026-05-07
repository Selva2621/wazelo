import apiClient from "./client";
import type {
  Channel,
  ChannelCapabilities,
  CreateChannelRequest,
  UpdateChannelRequest,
  SuspendChannelRequest,
  ListChannelsParams,
} from "@/lib/types/channels";

export const channelsApi = {
  list: (params?: ListChannelsParams) =>
    apiClient
      .get<Channel[]>("/channels", { params })
      .then((r) => r.data),

  getById: (id: string) =>
    apiClient.get<Channel>(`/channels/${id}`).then((r) => r.data),

  getCapabilities: (id: string) =>
    apiClient
      .get<ChannelCapabilities>(`/channels/${id}/capabilities`)
      .then((r) => r.data),

  create: (data: CreateChannelRequest) =>
    apiClient.post<Channel>("/channels", data).then((r) => r.data),

  update: (id: string, data: UpdateChannelRequest) =>
    apiClient.put<Channel>(`/channels/${id}`, data).then((r) => r.data),

  suspend: (id: string, data: SuspendChannelRequest) =>
    apiClient
      .post(`/channels/${id}/suspend`, data)
      .then((r) => r.data),

  reactivate: (id: string) =>
    apiClient
      .post(`/channels/${id}/reactivate`)
      .then((r) => r.data),

  delete: (id: string) =>
    apiClient.delete(`/channels/${id}`).then((r) => r.data),
};
