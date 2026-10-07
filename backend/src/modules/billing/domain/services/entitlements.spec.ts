import { effectiveFeature, effectiveLimit, EntitlementOverrideLike } from './entitlements';

const now = new Date('2026-10-07T12:00:00Z');
const limit = (key: string, limitValue: number, expiresAt: Date | null = null): EntitlementOverrideLike => ({
  kind: 'LIMIT', key, limitValue, enabled: null, expiresAt,
});
const feature = (key: string, enabled: boolean, expiresAt: Date | null = null): EntitlementOverrideLike => ({
  kind: 'FEATURE', key, limitValue: null, enabled, expiresAt,
});

describe('entitlements', () => {
  it('uses the plan limit with no override', () => {
    expect(effectiveLimit(1000, [], 'MESSAGES_SENT', now)).toEqual({ value: 1000, overridden: false });
  });

  it('applies an active limit override, including 0 = unlimited', () => {
    expect(effectiveLimit(1000, [limit('MESSAGES_SENT', 5000)], 'MESSAGES_SENT', now)).toEqual({ value: 5000, overridden: true });
    expect(effectiveLimit(1000, [limit('MESSAGES_SENT', 0)], 'MESSAGES_SENT', now).value).toBe(0);
  });

  it('ignores an expired override and other metrics', () => {
    const expired = limit('MESSAGES_SENT', 5000, new Date('2026-10-01T00:00:00Z'));
    expect(effectiveLimit(1000, [expired], 'MESSAGES_SENT', now).value).toBe(1000);
    expect(effectiveLimit(1000, [limit('API_CALLS', 5)], 'MESSAGES_SENT', now).value).toBe(1000);
  });

  it('can force a feature on or off regardless of the plan', () => {
    expect(effectiveFeature(false, [feature('ai', true)], 'ai', now)).toEqual({ enabled: true, overridden: true });
    expect(effectiveFeature(true, [feature('ai', false)], 'ai', now)).toEqual({ enabled: false, overridden: true });
    expect(effectiveFeature(true, [feature('ai', false, new Date('2026-10-01T00:00:00Z'))], 'ai', now).enabled).toBe(true);
  });
});
