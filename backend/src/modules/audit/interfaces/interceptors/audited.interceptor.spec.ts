import { Reflector } from '@nestjs/core';
import { Observable, lastValueFrom, of, throwError } from 'rxjs';
import { AuditedInterceptor } from './audited.interceptor';

function run(result: () => Observable<unknown>, options = { action: 'CHATBOT_FLOW_UPDATED', targetType: 'ChatbotFlow', idParam: 'flowId' }) {
  const audit = { log: jest.fn() };
  const reflector = { get: jest.fn().mockReturnValue(options) } as unknown as Reflector;
  const req = {
    user: { sub: 'user-1', orgId: 'org-1' },
    params: { flowId: 'flow-1' },
    body: { aiSystemPrompt: 'secret business prompt', aiEnabled: true },
    ip: '1.2.3.4',
    get: () => 'jest',
  };
  const context = { getHandler: () => null, switchToHttp: () => ({ getRequest: () => req }) } as never;
  const interceptor = new AuditedInterceptor(reflector, audit as never);
  return { audit, done: lastValueFrom(interceptor.intercept(context, { handle: result } as never)) };
}

describe('AuditedInterceptor', () => {
  it('logs who changed what, with field names but never their values', async () => {
    const { audit, done } = run(() => of({ id: 'flow-1' }));
    await done;
    expect(audit.log).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: 'org-1',
        userId: 'user-1',
        action: 'CHATBOT_FLOW_UPDATED',
        targetId: 'flow-1',
        metadata: { changedFields: ['aiSystemPrompt', 'aiEnabled'] },
        ipAddress: '1.2.3.4',
      }),
    );
    expect(JSON.stringify(audit.log.mock.calls[0][0])).not.toContain('secret business prompt');
  });

  it('does not log a failed request', async () => {
    const { audit, done } = run(() => throwError(() => new Error('nope')));
    await expect(done).rejects.toThrow('nope');
    expect(audit.log).not.toHaveBeenCalled();
  });
});
