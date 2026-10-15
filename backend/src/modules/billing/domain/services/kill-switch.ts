import { FEATURE_KEYS, FeatureKey } from './entitlements';

/** Machine-readable error code returned when a platform kill switch blocks a feature. */
export const FEATURE_DISABLED_PLATFORM = 'FEATURE_DISABLED_PLATFORM';

export const FEATURE_LABELS: Record<FeatureKey, string> = {
  campaigns: 'Campaigns',
  automation: 'Automation',
  api: 'Developer API',
  ai: 'AI',
  shopify: 'Shopify',
};

export interface KillSwitchLike {
  feature: string;
  disabled: boolean;
  reason: string | null;
  disabledById: string | null;
  disabledAt: Date | null;
  updatedAt?: Date | null;
}

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as readonly string[]).includes(value);
}

/** Message shown to tenants when a feature is switched off platform-wide. */
export function killSwitchMessage(feature: FeatureKey): string {
  return `${FEATURE_LABELS[feature]} is temporarily unavailable. Please try again later.`;
}

export type FeatureDecisionSource = 'PLATFORM' | 'OVERRIDE' | 'PLAN';

/**
 * Final feature decision for an org. A platform kill switch beats everything —
 * plan and super admin override alike; otherwise the entitlement result stands.
 */
export function decideFeatureAccess(
  entitlement: { enabled: boolean; overridden: boolean },
  platformDisabled: boolean,
): { enabled: boolean; source: FeatureDecisionSource } {
  if (platformDisabled) return { enabled: false, source: 'PLATFORM' };
  return { enabled: entitlement.enabled, source: entitlement.overridden ? 'OVERRIDE' : 'PLAN' };
}

/** All features with their switch state; features without a row are on. */
export function listKillSwitchStates(rows: KillSwitchLike[]) {
  return FEATURE_KEYS.map((feature) => {
    const row = rows.find((r) => r.feature === feature);
    const disabled = row?.disabled ?? false;
    return {
      feature,
      label: FEATURE_LABELS[feature],
      disabled,
      reason: disabled ? row?.reason ?? null : null,
      disabledById: disabled ? row?.disabledById ?? null : null,
      disabledAt: disabled ? row?.disabledAt?.toISOString() ?? null : null,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  });
}

export type KillSwitchChange =
  | { kind: 'noop' }
  | { kind: 'disable'; reason: string }
  | { kind: 'enable' };

/**
 * What a toggle request means given the current state. Disabling needs a
 * 3–500 char reason; re-sending the current state is a no-op (no audit noise).
 */
export function planKillSwitchChange(
  currentlyDisabled: boolean,
  disabled: boolean,
  reason?: string | null,
): KillSwitchChange | { kind: 'invalid'; error: string } {
  if (disabled) {
    const r = (reason ?? '').trim();
    if (r.length < 3 || r.length > 500) {
      return { kind: 'invalid', error: 'A reason (3–500 characters) is required to turn a feature off' };
    }
    if (currentlyDisabled) return { kind: 'noop' };
    return { kind: 'disable', reason: r };
  }
  return currentlyDisabled ? { kind: 'enable' } : { kind: 'noop' };
}
