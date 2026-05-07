import { SettingScope } from '@prisma/client';

export type SettingValueType = 'string' | 'number' | 'boolean' | 'json';

export interface SettingEntity {
  id: string;
  orgId: string | null;
  scope: SettingScope;
  category: string;
  key: string;
  value: unknown;
  valueType: SettingValueType;
  description: string | null;
  isSecret: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * Resolved setting after applying scope hierarchy:
 * SYSTEM → PLAN → ORG (ORG wins if present)
 */
export interface ResolvedSetting {
  key: string;
  category: string;
  value: unknown;
  valueType: SettingValueType;
  resolvedScope: SettingScope;
  isSecret: boolean;
}
