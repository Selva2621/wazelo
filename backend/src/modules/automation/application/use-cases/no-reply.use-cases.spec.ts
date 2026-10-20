import { AutomationTriggerType, MessageDirection } from '@prisma/client';
import { RunNoReplyCheckUseCase, ScheduleNoReplyChecksUseCase } from './no-reply.use-cases';

const job = {
  orgId: 'o1',
  ruleId: 'r1',
  messageId: 'm1',
  conversationId: 'c1',
  sentAt: '2026-10-20T10:00:00.000Z',
};

describe('RunNoReplyCheckUseCase', () => {
  function setup(laterMessage: unknown) {
    const prisma = {
      message: { findFirst: jest.fn(async () => laterMessage) },
      conversation: { findFirst: jest.fn(async () => ({ contactId: 'ct1', contactPhone: '+91', status: 'OPEN' })) },
    };
    const evaluateTrigger = { execute: jest.fn(async () => 1) };
    const useCase = new RunNoReplyCheckUseCase(prisma as never, evaluateTrigger as never);
    return { useCase, evaluateTrigger };
  }

  it('runs the rule for the contact when nothing came after our message', async () => {
    const { useCase, evaluateTrigger } = setup(null);
    await useCase.execute(job);
    expect(evaluateTrigger.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerType: AutomationTriggerType.NO_REPLY,
        onlyRuleId: 'r1',
        contactId: 'ct1',
        eventPayload: expect.objectContaining({ noReplyConfirmed: true, messageId: 'm1' }),
      }),
    );
  });

  it('does nothing once the contact (or we) wrote again', async () => {
    const { useCase, evaluateTrigger } = setup({ id: 'm2' });
    await useCase.execute(job);
    expect(evaluateTrigger.execute).not.toHaveBeenCalled();
  });
});

describe('ScheduleNoReplyChecksUseCase', () => {
  function setup(metadata: Record<string, unknown> | null, direction: MessageDirection = MessageDirection.OUTBOUND) {
    const prisma = {
      message: {
        findFirst: jest.fn(async () => ({
          id: 'm1',
          direction,
          conversationId: 'c1',
          createdAt: new Date(job.sentAt),
          metadata,
        })),
      },
    };
    const automationRepo = {
      findActiveRulesByTriggerType: jest.fn(async () => [{ id: 'r1', triggerConfig: { delaySeconds: 172800 } }]),
    };
    const queueService = { publishDelayed: jest.fn(async () => 'job') };
    const useCase = new ScheduleNoReplyChecksUseCase(prisma as never, automationRepo as never, queueService as never);
    return { useCase, queueService };
  }

  it('schedules a check per rule after its delay', async () => {
    const { useCase, queueService } = setup(null);
    await useCase.execute('o1', 'm1');
    expect(queueService.publishDelayed).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ ruleId: 'r1', messageId: 'm1' }),
      172800,
      { singletonKey: 'no-reply-r1-m1' },
    );
  });

  it('skips campaign messages, its own nudges and inbound messages', async () => {
    for (const s of [
      setup({ campaignId: 'cmp' }),
      setup({ automationRuleId: 'r1' }),
      setup(null, MessageDirection.INBOUND),
    ]) {
      await s.useCase.execute('o1', 'm1');
      expect(s.queueService.publishDelayed).not.toHaveBeenCalled();
    }
  });
});
