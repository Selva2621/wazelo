import { effectiveFeature } from './entitlements';
import {
  decideFeatureAccess,
  FEATURE_DISABLED_PLATFORM,
  isFeatureKey,
  killSwitchMessage,
  listKillSwitchStates,
  planKillSwitchChange,
} from './kill-switch';
import { FeatureDisabledPlatformException, KillSwitchService } from './kill-switch.service';

const override = (enabled: boolean) => ({
  kind: 'FEATURE' as const, key: 'campaigns', limitValue: null, enabled, expiresAt: null,
});

describe('decideFeatureAccess', () => {
  it('a kill switch denies the feature even when the plan and an override allow it', () => {
    const allowedByOverride = effectiveFeature(false, [override(true)], 'campaigns');
    expect(allowedByOverride.enabled).toBe(true);
    expect(decideFeatureAccess(allowedByOverride, true)).toEqual({ enabled: false, source: 'PLATFORM' });
    expect(decideFeatureAccess({ enabled: true, overridden: false }, true)).toEqual({ enabled: false, source: 'PLATFORM' });
  });

  it('without a kill switch the entitlement decision stands', () => {
    expect(decideFeatureAccess({ enabled: true, overridden: false }, false)).toEqual({ enabled: true, source: 'PLAN' });
    expect(decideFeatureAccess({ enabled: false, overridden: false }, false)).toEqual({ enabled: false, source: 'PLAN' });
    expect(decideFeatureAccess({ enabled: false, overridden: true }, false)).toEqual({ enabled: false, source: 'OVERRIDE' });
  });
});

describe('planKillSwitchChange', () => {
  it('disabling requires a 3–500 char reason', () => {
    expect(planKillSwitchChange(false, true)).toMatchObject({ kind: 'invalid' });
    expect(planKillSwitchChange(false, true, '  no ')).toMatchObject({ kind: 'invalid' });
    expect(planKillSwitchChange(false, true, 'x'.repeat(501))).toMatchObject({ kind: 'invalid' });
    expect(planKillSwitchChange(false, true, '  provider outage  ')).toEqual({ kind: 'disable', reason: 'provider outage' });
  });

  it('re-sending the current state is a no-op; enabling needs no reason', () => {
    expect(planKillSwitchChange(true, true, 'still down')).toEqual({ kind: 'noop' });
    expect(planKillSwitchChange(false, false)).toEqual({ kind: 'noop' });
    expect(planKillSwitchChange(true, false)).toEqual({ kind: 'enable' });
  });
});

describe('listKillSwitchStates', () => {
  it('lists all five features; missing rows are on and stale details are hidden', () => {
    const at = new Date('2026-10-11T10:00:00Z');
    const states = listKillSwitchStates([
      { feature: 'ai', disabled: true, reason: 'LLM outage', disabledById: 'sa-1', disabledAt: at },
      { feature: 'api', disabled: false, reason: 'old', disabledById: 'sa-2', disabledAt: at },
    ]);
    expect(states.map((s) => s.feature)).toEqual(['campaigns', 'automation', 'api', 'ai', 'shopify']);
    expect(states.find((s) => s.feature === 'ai')).toMatchObject({
      disabled: true, reason: 'LLM outage', disabledById: 'sa-1', disabledAt: at.toISOString(), label: 'AI',
    });
    expect(states.find((s) => s.feature === 'api')).toMatchObject({ disabled: false, reason: null, disabledById: null });
    expect(states.find((s) => s.feature === 'campaigns')!.disabled).toBe(false);
  });
});

describe('helpers', () => {
  it('validates feature keys and builds the tenant message', () => {
    expect(isFeatureKey('shopify')).toBe(true);
    expect(isFeatureKey('billing')).toBe(false);
    expect(killSwitchMessage('campaigns')).toBe('Campaigns is temporarily unavailable. Please try again later.');
    const body = new FeatureDisabledPlatformException('ai').getResponse() as Record<string, unknown>;
    expect(body).toMatchObject({ statusCode: 403, error: FEATURE_DISABLED_PLATFORM, details: { feature: 'ai' } });
  });
});

describe('KillSwitchService', () => {
  const row = (feature: string, disabled: boolean) =>
    ({ feature, disabled, reason: null, disabledById: null, disabledAt: null, updatedAt: new Date() });

  it('caches reads and refreshes after invalidate()', async () => {
    const repo = { findAll: jest.fn().mockResolvedValue([row('campaigns', true)]) };
    const svc = new KillSwitchService(repo as any);
    expect(await svc.isDisabled('campaigns')).toBe(true);
    expect(await svc.isDisabled('ai')).toBe(false);
    expect(repo.findAll).toHaveBeenCalledTimes(1);

    repo.findAll.mockResolvedValue([]);
    svc.invalidate();
    expect(await svc.isDisabled('campaigns')).toBe(false);
    expect(repo.findAll).toHaveBeenCalledTimes(2);
  });

  it('assertEnabled throws FEATURE_DISABLED_PLATFORM only for a disabled feature', async () => {
    const svc = new KillSwitchService({ findAll: jest.fn().mockResolvedValue([row('api', true)]) } as any);
    await expect(svc.assertEnabled('api')).rejects.toBeInstanceOf(FeatureDisabledPlatformException);
    await expect(svc.assertEnabled('ai')).resolves.toBeUndefined();
  });

  it('fails open on a read error, keeping the last known state', async () => {
    const repo = { findAll: jest.fn().mockRejectedValue(new Error('db down')) };
    const svc = new KillSwitchService(repo as any);
    expect(await svc.isDisabled('campaigns')).toBe(false);

    repo.findAll.mockResolvedValueOnce([row('campaigns', true)]);
    svc.invalidate();
    expect(await svc.isDisabled('campaigns')).toBe(true);
    svc.invalidate();
    // DB fails again: the last known "disabled" state is kept rather than dropped
    expect(await svc.isDisabled('campaigns')).toBe(true);
  });
});
