import { CampaignRecipientStatus, SequenceStatus } from '@prisma/client';
import { SequenceStepWorker } from './sequence-step.worker';
import { NO_WHATSAPP_PERMISSION_REASON } from '@/modules/contacts/domain/services/whatsapp-permission.service';

const contact = {
  id: 'c1',
  name: 'Asha',
  phoneNumber: '+919000000001',
  email: null,
  leadStatus: 'NEW',
  deletedAt: null,
  mergedIntoId: null,
  source: 'WEB_SCRAPE',
};

type Channel = 'WHATSAPP' | 'EMAIL';

function setup(permitted: boolean | boolean[], channels: Channel[] = ['WHATSAPP'], currentStep = 0) {
  const steps = channels.map((channel, i) => ({
    id: `st${i + 1}`,
    stepOrder: i,
    channel,
    messageType: 'TEXT',
    messageBody: 'Hi',
    emailSubject: 'Hi',
    delayMinutes: i === 0 ? 0 : 60,
  }));
  const sequenceRepo = {
    getStepsBySequence: jest.fn(async () => steps),
    findDueRecipient: jest.fn(async () => ({
      id: 'sr1',
      contactId: 'c1',
      contactPhone: '+919000000001',
      currentStep,
      sequence: { status: SequenceStatus.ACTIVE, sessionId: 's1' },
    })),
    exitRecipient: jest.fn(async () => undefined),
    updateSequenceCounters: jest.fn(async () => undefined),
    createRecipientStep: jest.fn(async () => ({ id: 'rs1' })),
    updateRecipientStepStatus: jest.fn(async () => undefined),
    advanceRecipient: jest.fn(async () => undefined),
    completeRecipient: jest.fn(async () => undefined),
  };
  const messageRepo = { create: jest.fn(async () => ({ id: 'm1' })) };
  const queueService = { publishOnce: jest.fn(async () => 'job') };
  const prisma = {
    contact: {
      findFirst: jest.fn(async () => null), // not opted out
      findUnique: jest.fn(async () => contact),
    },
  };
  const orgEmail = { queue: jest.fn(async () => ({ status: 'QUEUED', emailMessageId: 'em1' })) };
  const answers = Array.isArray(permitted) ? [...permitted] : null;
  const permission = {
    isPermitted: jest.fn(async () => (answers ? answers.shift() ?? false : (permitted as boolean))),
  };
  const worker = new SequenceStepWorker(
    queueService as never,
    sequenceRepo as never,
    messageRepo as never,
    { emit: jest.fn() } as never,
    prisma as never,
    orgEmail as never,
    permission as never,
  );
  const sendStep = (worker as unknown as {
    sendStep: (d: { recipientId: string; orgId: string; sequenceId: string; sessionId: string }) => Promise<void>;
  }).sendStep.bind(worker);
  return { sendStep, sequenceRepo, messageRepo, permission, orgEmail, queueService };
}

const job = { recipientId: 'sr1', orgId: 'o1', sequenceId: 'seq1', sessionId: 's1' };

describe('SequenceStepWorker WhatsApp permission re-check', () => {
  it('skips a WhatsApp step for a lead finder contact without permission, recording why, and moves to the next step on schedule', async () => {
    const { sendStep, sequenceRepo, messageRepo, permission, queueService } = setup(false, ['WHATSAPP', 'EMAIL']);
    const before = Date.now();
    await sendStep(job);

    expect(permission.isPermitted).toHaveBeenCalledWith('o1', contact);
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(queueService.publishOnce).not.toHaveBeenCalled();
    expect(sequenceRepo.exitRecipient).not.toHaveBeenCalled();
    expect(sequenceRepo.createRecipientStep).toHaveBeenCalledWith(
      expect.objectContaining({ recipientId: 'sr1', stepId: 'st1', orgId: 'o1' }),
    );
    expect(sequenceRepo.updateRecipientStepStatus).toHaveBeenCalledWith(
      'rs1',
      CampaignRecipientStatus.SKIPPED,
      expect.objectContaining({ failedReason: NO_WHATSAPP_PERMISSION_REASON }),
    );
    // Next (email) step is due after its own 60 minute delay
    const [, nextIndex, nextAt] = (sequenceRepo.advanceRecipient.mock.calls[0] as unknown) as [string, number, Date];
    expect(nextIndex).toBe(1);
    expect(nextAt.getTime()).toBeGreaterThanOrEqual(before + 60 * 60_000);
    expect(sequenceRepo.completeRecipient).not.toHaveBeenCalled();
    expect(sequenceRepo.updateSequenceCounters).toHaveBeenCalledWith('seq1');
  });

  it('finishes the recipient normally when the skipped WhatsApp step was the last step', async () => {
    const { sendStep, sequenceRepo, messageRepo } = setup(false, ['EMAIL', 'WHATSAPP'], 1);
    await sendStep(job);
    expect(messageRepo.create).not.toHaveBeenCalled();
    expect(sequenceRepo.advanceRecipient).toHaveBeenCalledWith('sr1', 2, null);
    expect(sequenceRepo.completeRecipient).toHaveBeenCalledWith('sr1');
    expect(sequenceRepo.exitRecipient).not.toHaveBeenCalled();
  });

  it('re-checks at each WhatsApp step: a later step sends once they have agreed', async () => {
    const { sendStep, sequenceRepo, messageRepo, permission } = setup([true], ['WHATSAPP', 'EMAIL', 'WHATSAPP'], 2);
    await sendStep(job);
    expect(permission.isPermitted).toHaveBeenCalledTimes(1);
    expect(messageRepo.create).toHaveBeenCalled();
    expect(sequenceRepo.updateRecipientStepStatus).toHaveBeenCalledWith(
      'rs1',
      CampaignRecipientStatus.QUEUED,
      expect.objectContaining({ messageId: 'm1' }),
    );
  });

  it('sends the WhatsApp step to a permitted contact', async () => {
    const { sendStep, sequenceRepo, messageRepo } = setup(true);
    await sendStep(job);
    expect(messageRepo.create).toHaveBeenCalled();
    expect(sequenceRepo.exitRecipient).not.toHaveBeenCalled();
  });

  it('email steps are not checked for WhatsApp permission', async () => {
    const { sendStep, orgEmail, permission } = setup(false, ['EMAIL']);
    await sendStep(job);
    expect(orgEmail.queue).toHaveBeenCalled();
    expect(permission.isPermitted).not.toHaveBeenCalled();
  });
});
