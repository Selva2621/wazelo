export const FEATURE_KEYS = ['campaigns', 'automation', 'api', 'ai', 'shopify'] as const;
export type FeatureKey = (typeof FEATURE_KEYS)[number];

export interface EntitlementOverrideLike {
  kind: 'LIMIT' | 'FEATURE';
  key: string;
  limitValue: number | null;
  enabled: boolean | null;
  expiresAt: Date | null;
}

export function isOverrideActive(o: Pick<EntitlementOverrideLike, 'expiresAt'>, now = new Date()): boolean {
  return !o.expiresAt || o.expiresAt > now;
}

/** Limit for a usage metric: an active override wins over the plan (0 = unlimited). */
export function effectiveLimit(
  planLimit: number,
  overrides: EntitlementOverrideLike[],
  metric: string,
  now = new Date(),
): { value: number; overridden: boolean } {
  const o = overrides.find(
    (x) => x.kind === 'LIMIT' && x.key === metric && x.limitValue !== null && isOverrideActive(x, now),
  );
  return o ? { value: o.limitValue!, overridden: true } : { value: planLimit, overridden: false };
}

/** Whether a feature is on: an active override (on or off) wins over the plan. */
export function effectiveFeature(
  planEnabled: boolean,
  overrides: EntitlementOverrideLike[],
  feature: FeatureKey,
  now = new Date(),
): { enabled: boolean; overridden: boolean } {
  const o = overrides.find(
    (x) => x.kind === 'FEATURE' && x.key === feature && x.enabled !== null && isOverrideActive(x, now),
  );
  return o ? { enabled: o.enabled!, overridden: true } : { enabled: planEnabled, overridden: false };
}
