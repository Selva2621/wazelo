import apiClient from "./client";
import type {
  LeadScoringRule,
  ContactScore,
  ScoreHistoryResponse,
  CreateScoringRuleRequest,
  UpdateScoringRuleRequest,
  SetContactScoreRequest,
} from "@/lib/types/lead-scoring";

// ─── Scoring Rules ───

export async function listScoringRules(): Promise<LeadScoringRule[]> {
  const { data } = await apiClient.get("/lead-scoring/rules");
  return data;
}

export async function createScoringRule(req: CreateScoringRuleRequest): Promise<LeadScoringRule> {
  const { data } = await apiClient.post("/lead-scoring/rules", req);
  return data;
}

export async function updateScoringRule(id: string, req: UpdateScoringRuleRequest): Promise<LeadScoringRule> {
  const { data } = await apiClient.patch(`/lead-scoring/rules/${id}`, req);
  return data;
}

export async function deleteScoringRule(id: string): Promise<void> {
  await apiClient.delete(`/lead-scoring/rules/${id}`);
}

// ─── Contact Scores ───

export async function getContactScore(contactId: string): Promise<ContactScore> {
  const { data } = await apiClient.get(`/lead-scoring/contacts/${contactId}/score`);
  return data;
}

export async function setContactScore(contactId: string, req: SetContactScoreRequest): Promise<ContactScore> {
  const { data } = await apiClient.post(`/lead-scoring/contacts/${contactId}/score`, req);
  return data;
}

export async function getScoreHistory(contactId: string, take = 20, skip = 0): Promise<ScoreHistoryResponse> {
  const { data } = await apiClient.get(`/lead-scoring/contacts/${contactId}/score-history`, {
    params: { take, skip },
  });
  return data;
}
