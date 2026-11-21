import { SequenceStatus } from '@prisma/client';
import { EnrollContactUseCase } from './enroll-contact.use-case';

const lead = { id: 'c1', phoneNumber: '+919000000001', optedOut: false, source: 'WEB_SCRAPE' };

/** emailSteps: how many of the sequence's steps are email (_count.steps counts EMAIL steps) */
function setup(opts: { emailSteps?: number; permitted?: boolean; contact?: Record<string, unknown> } = {}) {
  const repo = {
    findActiveForEnroll: jest.fn(async () => ({
      id: 'seq1',
      status: SequenceStatus.ACTIVE,
      steps: [{ delayMinutes: 0 }],
      _count: { steps: opts.emailSteps ?? 0 },
    })),
    findRecipient: jest.fn(async () => null),
    enrollOne: jest.fn(async () => ({ id: 'sr1' })),
    updateSequenceCounters: jest.fn(async () => undefined),
  };
  const prisma = { contact: { findFirst: jest.fn(async () => opts.contact ?? lead) } };
  const queueService = { publishOnce: jest.fn(async () => 'job') };
  const permission = { isPermitted: jest.fn(async () => opts.permitted ?? false) };
  const useCase = new EnrollContactUseCase(repo as never, prisma as never, queueService as never, permission as never);
  return { useCase, repo, permission };
}

describe('EnrollContactUseCase', () => {
  it('refuses a lead finder contact without WhatsApp permission into a WhatsApp-only sequence', async () => {
    const { useCase, repo, permission } = setup({ emailSteps: 0, permitted: false });
    await expect(useCase.execute('o1', 'seq1', 'c1')).resolves.toEqual({ enrolled: false, reason: 'NO_WHATSAPP_PERMISSION' });
    expect(permission.isPermitted).toHaveBeenCalledWith('o1', lead);
    expect(repo.enrollOne).not.toHaveBeenCalled();
  });

  it('enrolls once the contact is permitted', async () => {
    const { useCase, repo } = setup({ emailSteps: 0, permitted: true });
    await expect(useCase.execute('o1', 'seq1', 'c1')).resolves.toEqual({ enrolled: true, recipientId: 'sr1' });
    expect(repo.enrollOne).toHaveBeenCalled();
  });

  it('enrolls an unpermitted lead finder contact into a mixed sequence (its WhatsApp steps are skipped later)', async () => {
    const { useCase, repo, permission } = setup({ emailSteps: 1, permitted: false });
    await expect(useCase.execute('o1', 'seq1', 'c1')).resolves.toEqual({ enrolled: true, recipientId: 'sr1' });
    expect(repo.enrollOne).toHaveBeenCalled();
    expect(permission.isPermitted).not.toHaveBeenCalled();
  });

  it('email-only sequences need no WhatsApp permission', async () => {
    const { useCase, permission } = setup({ emailSteps: 3, permitted: false });
    await expect(useCase.execute('o1', 'seq1', 'c1')).resolves.toMatchObject({ enrolled: true });
    expect(permission.isPermitted).not.toHaveBeenCalled();
  });

  it('opt-out is still checked first', async () => {
    const { useCase, permission } = setup({ contact: { ...lead, optedOut: true } });
    await expect(useCase.execute('o1', 'seq1', 'c1')).resolves.toEqual({ enrolled: false, reason: 'OPTED_OUT' });
    expect(permission.isPermitted).not.toHaveBeenCalled();
  });
});
