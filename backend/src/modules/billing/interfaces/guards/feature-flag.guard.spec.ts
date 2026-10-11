import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagGuard, FEATURE_FLAG_KEY } from './feature-flag.guard';

function ctx(opts: { handlerFeature?: string; classFeature?: string; orgId?: string; apiKeyOrgId?: string }) {
  const handler = () => undefined;
  class Ctrl {}
  if (opts.handlerFeature) Reflect.defineMetadata(FEATURE_FLAG_KEY, opts.handlerFeature, handler);
  if (opts.classFeature) Reflect.defineMetadata(FEATURE_FLAG_KEY, opts.classFeature, Ctrl);
  const request = {
    user: opts.orgId ? { orgId: opts.orgId } : undefined,
    apiKeyAuth: opts.apiKeyOrgId ? { orgId: opts.apiKeyOrgId } : undefined,
  };
  return {
    getHandler: () => handler,
    getClass: () => Ctrl,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

function guard(enabled: boolean) {
  const usage = { getFeatureAccess: jest.fn().mockResolvedValue({ enabled, source: 'PLAN' }) };
  const killSwitches = { assertEnabled: jest.fn() };
  return { g: new FeatureFlagGuard(new Reflector(), usage as any, killSwitches as any), usage, killSwitches };
}

describe('FeatureFlagGuard', () => {
  it('enforces the plan for CLASS-level metadata (the developer API)', async () => {
    const { g, usage } = guard(false);
    await expect(g.canActivate(ctx({ classFeature: 'api', apiKeyOrgId: 'org-1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(usage.getFeatureAccess).toHaveBeenCalledWith('org-1', 'api');
  });

  it('allows an API-key caller whose plan includes the feature', async () => {
    const { g, killSwitches } = guard(true);
    await expect(g.canActivate(ctx({ classFeature: 'api', apiKeyOrgId: 'org-1' }))).resolves.toBe(true);
    expect(killSwitches.assertEnabled).toHaveBeenCalledWith('api');
  });

  it('still enforces handler-level metadata', async () => {
    const { g } = guard(false);
    await expect(g.canActivate(ctx({ handlerFeature: 'campaigns', orgId: 'org-1' }))).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('a handler-level feature wins over the class-level one', async () => {
    const { g, usage } = guard(true);
    await g.canActivate(ctx({ handlerFeature: 'ai', classFeature: 'api', orgId: 'org-1' }));
    expect(usage.getFeatureAccess).toHaveBeenCalledWith('org-1', 'ai');
  });

  it('routes without a feature pass untouched', async () => {
    const { g, usage, killSwitches } = guard(false);
    await expect(g.canActivate(ctx({ orgId: 'org-1' }))).resolves.toBe(true);
    expect(usage.getFeatureAccess).not.toHaveBeenCalled();
    expect(killSwitches.assertEnabled).not.toHaveBeenCalled();
  });
});
