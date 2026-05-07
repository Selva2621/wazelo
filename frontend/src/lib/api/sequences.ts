import apiClient from "./client";
import type {
  CampaignSequence,
  SequenceListResponse,
  SequenceRecipientsResponse,
  CreateSequenceRequest,
  SequenceStatus,
  SequenceAnalytics,
} from "@/lib/types/sequences";

export async function listSequences(params?: {
  status?: SequenceStatus;
  take?: number;
  skip?: number;
}): Promise<SequenceListResponse> {
  const { data } = await apiClient.get("/sequences", { params });
  return data;
}

export async function getSequence(id: string): Promise<CampaignSequence> {
  const { data } = await apiClient.get(`/sequences/${id}`);
  return data;
}

export async function createSequence(req: CreateSequenceRequest): Promise<CampaignSequence> {
  const { data } = await apiClient.post("/sequences", req);
  return data;
}

export async function deleteSequence(id: string): Promise<void> {
  await apiClient.delete(`/sequences/${id}`);
}

export async function startSequence(id: string): Promise<CampaignSequence> {
  const { data } = await apiClient.post(`/sequences/${id}/start`);
  return data;
}

export async function pauseSequence(id: string): Promise<CampaignSequence> {
  const { data } = await apiClient.post(`/sequences/${id}/pause`);
  return data;
}

export async function resumeSequence(id: string): Promise<CampaignSequence> {
  const { data } = await apiClient.post(`/sequences/${id}/resume`);
  return data;
}

export async function cancelSequence(id: string): Promise<CampaignSequence> {
  const { data } = await apiClient.post(`/sequences/${id}/cancel`);
  return data;
}

export async function getSequenceRecipients(id: string, take = 50, skip = 0): Promise<SequenceRecipientsResponse> {
  const { data } = await apiClient.get(`/sequences/${id}/recipients`, { params: { take, skip } });
  return data;
}

// Analytics
export async function getSequenceAnalytics(id: string): Promise<SequenceAnalytics> {
  const { data } = await apiClient.get(`/sequences/${id}/analytics`);
  return data;
}
