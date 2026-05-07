import { WebhookDeliveryStatus } from '@prisma/client';

export interface WebhookEntity {
  id: string;
  orgId: string;
  url: string;
  secret: string;
  description: string | null;
  events: string[];
  headers: Record<string, string> | null;
  enabled: boolean;
  maxRetries: number;
  timeoutMs: number;
  lastDeliveryAt: Date | null;
  failureCount: number;
  disabledAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface WebhookDeliveryEntity {
  id: string;
  webhookId: string;
  orgId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  responseBody: string | null;
  error: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: Date | null;
  idempotencyKey: string | null;
  duration: number | null;
  createdAt: Date;
  updatedAt: Date;
}
