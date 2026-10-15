import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { CSRF_PROTECTED_KEY, IS_PUBLIC_KEY } from '@/common/decorators';
import { CsrfGuard } from './csrf.guard';

function ctx(metadata: Record<string, unknown>, headers: Record<string, string> = {}, method = 'POST') {
  const handler = () => undefined;
  Object.entries(metadata).forEach(([k, v]) => Reflect.defineMetadata(k, v, handler));
  return {
    getHandler: () => handler,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => ({ method, headers }) }),
  } as unknown as ExecutionContext;
}

describe('CsrfGuard', () => {
  const guard = new CsrfGuard(new Reflector());
  const xhr = { 'x-requested-with': 'XMLHttpRequest' };

  it('skips plain public routes (login, webhooks)', () => {
    expect(guard.canActivate(ctx({ [IS_PUBLIC_KEY]: true }))).toBe(true);
  });

  it('checks public routes marked @CsrfProtected (cookie refresh/logout)', () => {
    const meta = { [IS_PUBLIC_KEY]: true, [CSRF_PROTECTED_KEY]: true };
    expect(() => guard.canActivate(ctx(meta))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx(meta, xhr))).toBe(true);
  });

  it('checks authenticated state-changing routes, not GETs', () => {
    expect(() => guard.canActivate(ctx({}))).toThrow(ForbiddenException);
    expect(guard.canActivate(ctx({}, {}, 'GET'))).toBe(true);
  });
});
