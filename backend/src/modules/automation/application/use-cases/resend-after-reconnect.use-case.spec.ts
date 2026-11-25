import { ResendAfterReconnectUseCase } from './resend-after-reconnect.use-case';
import { NO_WHATSAPP_SESSION, RESEND_WINDOW_MS, resendFromStep } from '../../domain/services/resend-after-reconnect';

const noSession = { actionType: 'SEND_MESSAGE', success: false, result: { code: NO_WHATSAPP_SESSION } };
const otherFailure = { actionType: 'SEND_MESSAGE', success: false, error: 'Template not approved' };
const ok = { actionType: 'ADD_TAG', success: true };

describe('resendFromStep', () => {
  it('resumes at the step that failed for want of a number', () => {
    expect(resendFromStep([noSession])).toBe(0);
    expect(resendFromStep([ok, noSession])).toBe(1);
  });

  it('leaves other failures and odd data alone', () => {
    expect(resendFromStep([ok, otherFailure])).toBeNull();
    expect(resendFromStep([ok])).toBeNull();
    expect(resendFromStep(null)).toBeNull();
  });
});

function setup(runs: Array<{ id: string; actionResults: unknown }>, claim = true) {
  const repo = {
    findFailedNotResent: jest.fn().mockResolvedValue(runs.map((r) => ({ ruleId: 'r1', contactId: 'c1', ...r }))),
    claimForResend: jest.fn().mockResolvedValue(claim),
  };
  const queue = { publishOnce: jest.fn().mockResolvedValue('job') };
  return { uc: new ResendAfterReconnectUseCase(repo as any, queue as any), repo, queue };
}

describe('ResendAfterReconnectUseCase', () => {
  const now = new Date('2026-11-22T12:00:00Z');

  it('re-queues runs that failed for want of a number, from the failed step, within 24h', async () => {
    const t = setup([
      { id: 'e1', actionResults: [ok, noSession] },
      { id: 'e2', actionResults: [otherFailure] },
    ]);
    await expect(t.uc.execute('o1', now)).resolves.toBe(1);

    expect(t.repo.findFailedNotResent).toHaveBeenCalledWith('o1', new Date(now.getTime() - RESEND_WINDOW_MS));
    expect(t.repo.claimForResend).toHaveBeenCalledTimes(1);
    expect(t.queue.publishOnce).toHaveBeenCalledWith(
      expect.any(String),
      { executionId: 'e1', ruleId: 'r1', orgId: 'o1', contactId: 'c1', depth: 0, startAtAction: 1 },
      'auto-resend-e1',
    );
  });

  it('a run another reconnect already took is not sent twice', async () => {
    const t = setup([{ id: 'e1', actionResults: [noSession] }], false);
    await expect(t.uc.execute('o1', now)).resolves.toBe(0);
    expect(t.queue.publishOnce).not.toHaveBeenCalled();
  });
});
