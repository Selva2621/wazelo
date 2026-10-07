import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '@/common/decorators/public.decorator';
import { IS_SUPER_ADMIN_ROUTE_KEY } from '@/common/decorators/super-admin-route.decorator';
import { OrgStatusGuard, ORG_SUSPENDED_CODE } from './org-status.guard';

function context(user: unknown, metadata: Record<string, unknown> = {}): ExecutionContext {
  const handler = () => undefined;
  Object.entries(metadata).forEach(([k, v]) => Reflect.defineMetadata(k, v, handler));
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

function guard(suspended: boolean) {
  const orgStatus = { isSuspended: jest.fn().mockResolvedValue(suspended) };
  return { guard: new OrgStatusGuard(new Reflector(), orgStatus as any), orgStatus };
}

describe('OrgStatusGuard', () => {
  it('lets an active org through', async () => {
    const { guard: g } = guard(false);
    await expect(g.canActivate(context({ orgId: 'org-1' }))).resolves.toBe(true);
  });

  it('blocks a suspended org with the ORG_SUSPENDED code', async () => {
    const { guard: g } = guard(true);
    const err = await g.canActivate(context({ orgId: 'org-1' })).catch((e) => e);
    expect(err).toBeInstanceOf(ForbiddenException);
    expect((err as ForbiddenException).getResponse()).toMatchObject({ error: ORG_SUSPENDED_CODE });
  });

  it('skips public routes without a lookup', async () => {
    const { guard: g, orgStatus } = guard(true);
    await expect(g.canActivate(context(undefined, { [IS_PUBLIC_KEY]: true }))).resolves.toBe(true);
    expect(orgStatus.isSuspended).not.toHaveBeenCalled();
  });

  it('skips super admin routes so the owner can still manage a suspended org', async () => {
    const { guard: g, orgStatus } = guard(true);
    await expect(g.canActivate(context(undefined, { [IS_SUPER_ADMIN_ROUTE_KEY]: true }))).resolves.toBe(true);
    expect(orgStatus.isSuspended).not.toHaveBeenCalled();
  });
});
