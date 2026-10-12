import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeyGuard } from './api-key.guard';
import { ApiKeyResourceScope } from './api-key-scope.decorator';

class Endpoints {
  @ApiKeyResourceScope('messages')
  sendMessage() {}

  @ApiKeyResourceScope('contacts')
  listContacts() {}

  sessionStatus() {}
}

function contextFor(method: string, handler: () => void): ExecutionContext {
  const request = { method, headers: { 'x-api-key': 'crm_sk_test' }, ip: '127.0.0.1' };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => handler,
    getClass: () => Endpoints,
  } as unknown as ExecutionContext;
}

function guardWithScopes(scopes: string[] | null) {
  const repo = {
    validateKey: jest.fn().mockResolvedValue(scopes && { id: 'key-1', orgId: 'org-1', scopes }),
  };
  const orgStatus = { isSuspended: jest.fn().mockResolvedValue(false) };
  return new ApiKeyGuard(repo as never, orgStatus as never, new Reflector());
}

describe('ApiKeyGuard scopes', () => {
  const proto = Endpoints.prototype;

  it('rejects an unknown key', async () => {
    await expect(guardWithScopes(null).canActivate(contextFor('GET', proto.sessionStatus)))
      .rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('blocks a read-only key from sending messages', async () => {
    const guard = guardWithScopes(['read', 'messages']);
    await expect(guard.canActivate(contextFor('POST', proto.sendMessage)))
      .rejects.toThrow("needs the 'write' scope");
  });

  it('blocks a key without the endpoint resource scope', async () => {
    const guard = guardWithScopes(['read', 'write', 'messages']);
    await expect(guard.canActivate(contextFor('GET', proto.listContacts)))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows a key with the access and resource scopes', async () => {
    const guard = guardWithScopes(['write', 'messages']);
    await expect(guard.canActivate(contextFor('POST', proto.sendMessage))).resolves.toBe(true);
  });

  it('needs only read for endpoints without a resource scope', async () => {
    const guard = guardWithScopes(['read']);
    await expect(guard.canActivate(contextFor('GET', proto.sessionStatus))).resolves.toBe(true);
  });
});
