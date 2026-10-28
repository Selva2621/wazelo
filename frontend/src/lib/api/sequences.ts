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

// ─── Editing (drafts: everything; paused: settings + existing messages) ───

export async function updateSequence(
  id: string,
  req: { name?: string; description?: string; exitOnReply?: boolean },
): Promise<CampaignSequence> {
  const { data } = await apiClient.patch(`/sequences/${id}`, req);
  return data;
}

export async function updateSequenceStep(
  id: string,
  stepId: string,
  req: { name?: string; messageBody?: string; delayMinutes?: number },
): Promise<CampaignSequence> {
  const { data } = await apiClient.patch(`/sequences/${id}/steps/${stepId}`, req);
  return data;
}

export async function addSequenceStep(
  id: string,
  req: { stepOrder: number; name?: string; messageType: string; messageBody: string; delayMinutes: number },
): Promise<CampaignSequence> {
  const { data } = await apiClient.post(`/sequences/${id}/steps`, req);
  return data;
}

export async function deleteSequenceStep(id: string, stepId: string): Promise<CampaignSequence> {
  const { data } = await apiClient.delete(`/sequences/${id}/steps/${stepId}`);
  return data;
}

/** AI draft of a whole sequence; nothing is saved until the user creates it. */
export interface GeneratedSequence {
  name: string;
  description: string;
  steps: { name: string; delayMinutes: number; messageBody: string }[];
}

export type SequenceRewriteStyle = "shorter" | "friendlier" | "formal";

export async function generateSequence(req: { prompt: string; stepCount: number }): Promise<GeneratedSequence> {
  const { data } = await apiClient.post("/sequences/generate", req, { timeout: 60_000 });
  return data;
}

export async function rewriteSequenceStep(req: {
  message: string;
  style: SequenceRewriteStyle;
  goal?: string;
}): Promise<{ messageBody: string }> {
  const { data } = await apiClient.post("/sequences/rewrite-step", req, { timeout: 30_000 });
  return data;
}

export async function deleteSequence(id: string): Promise<void> {
  await apiClient.delete(`/sequences/${id}`);
}

export async function startSequence(id: string): Promise<CampaignSequence> {
  const { data } = await apiClient.post(`/sequences/${id}/start`);
  return data;
}

/** Create + start an outreach sequence for a scrape run's imported leads */
export async function startOutreach(req: {
  scrapeRunId: string;
  name: string;
  steps: { messageBody: string; delayMinutes: number }[];
  onlyNew?: boolean;
}): Promise<CampaignSequence> {
  const { data } = await apiClient.post("/sequences/outreach", req);
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
