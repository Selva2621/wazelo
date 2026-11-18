// The real API service loads Baileys (ESM-only); the worker only needs its type here
jest.mock('@/infrastructure/external/whatsapp/whatsapp-api.service', () => ({ WhatsAppApiService: class {} }));

import { CampaignRecipientStatus, CampaignStatus, MessageStatus } from '@prisma/client';
import { SendMessageWorker } from './send-message.worker';
import { EVENT_NAMES } from '@/common/constants';

/**
 * The plan's monthly message limit is the volume limit. A campaign that hits it
 * must pause with its recipients PENDING — not fail them one by one.
 */
function build(message: Record<string, unknown>) {
  const messageRepo = {
    findById: jest.fn().mockResolvedValue(message),
    markFailed: jest.fn(),
  };
  const usageTracking = {
    checkUsage: jest.fn().mockResolvedValue({ allowed: false, currentValue: 1000, limitValue: 1000 }),
    hasEndedSubscription: jest.fn().mockResolvedValue(false),
  };
  const accountSafety = { dropBulkMessage: jest.fn(), checkBulkRelevance: jest.fn(), checkBulkSend: jest.fn() };
  const campaignRepo = {
    transitionStatus: jest.fn().mockResolvedValue({ id: 'c1', status: CampaignStatus.PAUSED }),
    recordEvent: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };
  const whatsappApi = { sendTextMessage: jest.fn() };

  const worker = new SendMessageWorker(
    { publishDelayed: jest.fn() } as never, // queueService
    whatsappApi as never,
    messageRepo as never,
    {} as never, // conversationRepo
    { record: jest.fn() } as never, // messageEventRepo
    {} as never, // deadLetterRepo
    {} as never, // sessionRepo
    {} as never, // rateLimiter
    { laneFor: () => 'bulk' } as never, // pacer
    accountSafety as never,
    {} as never, // auditService
    eventEmitter as never,
    { isSuspended: jest.fn().mockResolvedValue(false) } as never, // orgStatus
    { isDisabled: jest.fn().mockResolvedValue(false) } as never, // killSwitches
    usageTracking as never,
    campaignRepo as never,
  );
  return { worker, messageRepo, accountSafety, campaignRepo, eventEmitter, whatsappApi };
}

const run = (worker: SendMessageWorker) =>
  (worker as unknown as { handle: (d: unknown, id: string) => Promise<void> }).handle(
    { messageId: 'm1', sessionId: 's1', orgId: 'o1' },
    'job-1',
  );

describe('SendMessageWorker — plan message limit', () => {
  it('pauses the campaign and puts the recipient back to PENDING instead of failing it', async () => {
    const t = build({
      id: 'm1', orgId: 'o1', status: MessageStatus.QUEUED, priority: -1, retryCount: 0,
      contactPhone: '+15550001', metadata: { campaignId: 'c1' },
    });

    await run(t.worker);

    expect(t.campaignRepo.transitionStatus).toHaveBeenCalledWith('c1', CampaignStatus.RUNNING, CampaignStatus.PAUSED);
    expect(t.accountSafety.dropBulkMessage).toHaveBeenCalledWith(
      'm1', expect.stringContaining('Monthly message limit reached'), CampaignRecipientStatus.PENDING,
    );
    // Not failed, not reported as a failure, not sent
    expect(t.messageRepo.markFailed).not.toHaveBeenCalled();
    expect(t.eventEmitter.emit).not.toHaveBeenCalledWith(EVENT_NAMES.WHATSAPP_MESSAGE_FAILED, expect.anything());
    expect(t.whatsappApi.sendTextMessage).not.toHaveBeenCalled();
  });

  it('still fails a non-campaign message when the plan limit is reached', async () => {
    const t = build({
      id: 'm1', orgId: 'o1', status: MessageStatus.QUEUED, priority: 0, retryCount: 0,
      contactPhone: '+15550001', metadata: null,
    });

    await run(t.worker);

    expect(t.messageRepo.markFailed).toHaveBeenCalledWith('m1', expect.stringContaining('Monthly message limit reached'));
    expect(t.campaignRepo.transitionStatus).not.toHaveBeenCalled();
  });
});
