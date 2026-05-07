import { SettingScope } from '@prisma/client';

export interface FeatureFlagEntity {
  id: string;
  orgId: string | null;
  scope: SettingScope;
  featureKey: string;
  enabled: boolean;
  metadata: Record<string, unknown> | null;
  description: string | null;
  expiresAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Resolved feature flag after applying scope hierarchy + plan integration.
 * Resolution order: SYSTEM → PLAN (from billing) → ORG
 * If any scope disables, the feature is disabled (AND logic for higher scopes).
 * ORG can only enable if the plan allows it.
 */
export interface ResolvedFeatureFlag {
  featureKey: string;
  enabled: boolean;
  resolvedScope: SettingScope;
  planAllows: boolean;
  orgOverride: boolean | null;
  expired: boolean;
}
