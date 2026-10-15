export interface PipelineStage {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
  color: string | null;
  isWonStage: boolean;
  isLostStage: boolean;
}

export interface Pipeline {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  stages: PipelineStage[];
  createdAt: string;
}

export type DealStatus = "OPEN" | "WON" | "LOST";

export interface Deal {
  id: string;
  orgId: string;
  pipelineId: string;
  stageId: string;
  contactId: string;
  assignedToId: string | null;
  title: string;
  value: number | null;
  currency: string;
  status: DealStatus;
  expectedClose: string | null;
  closedAt: string | null;
  notes: string | null;
  /** Next time to follow up with the client */
  nextFollowUpAt: string | null;
  followUpNote: string | null;
  createdAt: string;
  updatedAt: string;
  stage: PipelineStage;
  contact: {
    id: string;
    name: string | null;
    phoneNumber: string;
    email: string | null;
  };
  assignedTo: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  productId: string | null;
  product: {
    id: string;
    name: string;
  } | null;
}

export interface CreateDealRequest {
  pipelineId: string;
  stageId: string;
  contactId: string;
  title: string;
  value?: number;
  currency?: string;
  assignedToId?: string;
  expectedClose?: string;
  notes?: string;
  productId?: string;
}

export interface UpdateDealRequest {
  title?: string;
  value?: number;
  currency?: string;
  assignedToId?: string;
  expectedClose?: string;
  notes?: string;
  status?: DealStatus;
  /** ISO time; null clears the follow-up */
  nextFollowUpAt?: string | null;
  followUpNote?: string | null;
}

/** A deal whose follow-up is due — from GET /pipelines/deals/follow-ups */
export interface DealFollowUp {
  id: string;
  pipelineId: string;
  title: string;
  value: number | string | null;
  currency: string;
  nextFollowUpAt: string;
  followUpNote: string | null;
  stage: { id: string; name: string; color: string | null };
  contact: { id: string; name: string | null; phoneNumber: string };
}

// ─── Deal Guard ───

export type GhostLevel = "active" | "your_turn" | "slow" | "cold" | "no_chat";
export type ScopeStatus = "DRAFT" | "SENT" | "APPROVED" | "CHANGES_REQUESTED";

export interface DealGuard {
  dealId: string;
  ghost: { level: GhostLevel; reason: string; suggestion: string | null };
  trust: {
    flags: { label: string; excerpt: string; at: string }[];
    history: { won: number; lost: number; open: number };
    standing: "first_time" | "returning" | "risky";
    suggestedAdvancePct: number;
    summary: string;
  };
  scope: {
    summary: string | null;
    status: ScopeStatus | null;
    sentAt: string | null;
    respondedAt: string | null;
  };
}

export interface MoveDealRequest {
  stageId: string;
  status?: DealStatus;
}

export interface CreatePipelineRequest {
  name: string;
  description?: string;
  stages?: { name: string; order: number; color?: string; isWonStage?: boolean; isLostStage?: boolean }[];
}

export interface DealAnalytics {
  totalDeals: number;
  totalValue: number;
  byStatus: { status: DealStatus; count: number; value: number }[];
  byStage: { stageId: string; count: number; value: number }[];
}
