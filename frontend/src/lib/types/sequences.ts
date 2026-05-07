export type SequenceStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "COMPLETED" | "CANCELLED";
export type SequenceRecipientStatus = "ACTIVE" | "COMPLETED" | "EXITED" | "PAUSED";

export interface StepCondition {
  keyword: string;
  goToStepOrder: number;
}

export interface SequenceStep {
  id: string;
  sequenceId: string;
  orgId: string;
  stepOrder: number;
  name: string | null;
  messageType: string;
  messageBody: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  delayMinutes: number;
  conditions: StepCondition[] | null;
  createdAt: string;
}

export interface SequenceCreator {
  id: string;
  firstName: string;
  lastName: string;
}

export interface CampaignSequence {
  id: string;
  orgId: string;
  sessionId: string;
  name: string;
  description: string | null;
  status: SequenceStatus;
  audienceType: "ALL" | "FILTERED";
  audienceFilters: Record<string, unknown> | null;
  exitOnReply: boolean;
  createdById: string;
  startedAt: string | null;
  completedAt: string | null;
  totalRecipients: number;
  completedCount: number;
  exitedCount: number;
  createdAt: string;
  updatedAt: string;
  steps: SequenceStep[];
  createdBy: SequenceCreator;
}

export interface SequenceListResponse {
  data: CampaignSequence[];
  total: number;
}

export interface SequenceRecipient {
  id: string;
  sequenceId: string;
  contactId: string;
  contactPhone: string;
  status: SequenceRecipientStatus;
  currentStep: number;
  nextStepAt: string | null;
  exitReason: string | null;
  enrolledAt: string;
  completedAt: string | null;
  contact: { id: string; name: string | null; phoneNumber: string };
}

export interface SequenceRecipientsResponse {
  data: SequenceRecipient[];
  total: number;
}

export interface CreateSequenceStepRequest {
  name?: string;
  messageType?: string;
  messageBody?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  delayMinutes?: number;
  conditions?: StepCondition[];
}

export interface CreateSequenceRequest {
  name: string;
  description?: string;
  sessionId: string;
  audienceType: "ALL" | "FILTERED";
  audienceFilters?: Record<string, unknown>;
  exitOnReply?: boolean;
  steps: CreateSequenceStepRequest[];
}

export interface SequenceAnalytics {
  totalRecipients: number;
  activeCount: number;
  completedCount: number;
  exitedCount: number;
  replyRate: number;
  avgCompletionHours: number | null;
  stepFunnel: { stepOrder: number; name: string; reached: number }[];
  exitReasons: { reason: string; count: number }[];
}

export function formatDelay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
