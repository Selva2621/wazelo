export interface LeadScoringRule {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  signal: string;
  condition: Record<string, unknown> | null;
  points: number;
  maxPerContact: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ContactScoreHistory {
  id: string;
  contactId: string;
  orgId: string;
  previousScore: number;
  newScore: number;
  delta: number;
  reason: string;
  ruleId: string | null;
  createdAt: string;
}

export interface ContactScore {
  id: string;
  leadScore: number;
  scoreUpdatedAt: string | null;
}

export interface ScoreHistoryResponse {
  data: ContactScoreHistory[];
  total: number;
}

export type CreateScoringRuleRequest = {
  name: string;
  description?: string;
  signal: string;
  condition?: Record<string, unknown>;
  points: number;
  maxPerContact?: number;
};

export type UpdateScoringRuleRequest = Partial<CreateScoringRuleRequest & { enabled: boolean }>;

export type SetContactScoreRequest = {
  score: number;
  reason?: string;
};

export const SCORING_SIGNALS = [
  { value: "contact_created", label: "Contact Created" },
  { value: "status_changed", label: "Lead Status Changed" },
  { value: "message_received", label: "Message Received" },
  { value: "note_added", label: "Note Added" },
  { value: "tag_added", label: "Tag Added" },
] as const;
