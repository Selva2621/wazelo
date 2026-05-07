import { IntegrationProvider, IntegrationStatus } from '@prisma/client';

export interface IntegrationConfigEntity {
  id: string;
  orgId: string;
  provider: IntegrationProvider;
  displayName: string;
  /** Encrypted credentials — never exposed in API responses */
  credentials: string;
  configuration: Record<string, unknown> | null;
  status: IntegrationStatus;
  lastTestedAt: Date | null;
  lastError: string | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/** Decrypted credential shapes per provider */
export interface SmtpCredentials {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface SendGridCredentials {
  apiKey: string;
}

export interface StripeCredentials {
  secretKey: string;
  webhookSecret: string;
}

export interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
  webhookSecret: string;
}

export type IntegrationCredentials =
  | SmtpCredentials
  | SendGridCredentials
  | StripeCredentials
  | RazorpayCredentials
  | Record<string, unknown>;
