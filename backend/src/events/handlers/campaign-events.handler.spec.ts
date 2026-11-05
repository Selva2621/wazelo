import { CampaignStatus } from '@prisma/client';
import { CampaignEventsHandler } from './campaign-events.handler';

describe('CampaignEventsHandler', () => {
  it('counts a dead-lettered campaign recipient as failed only once', async () => {
    const recipient = { id: 'recipient-1', campaignId: 'campaign-1' };
    const recipientRepo = {
      findByMessageId: jest.fn().mockResolvedValue(recipient),
      markFailedIfActive: jest.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
    };
    const campaignRepo = {
      incrementCounter: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'campaign-1',
        orgId: 'org-1',
        status: CampaignStatus.COMPLETED,
      }),
    };
    const handler = new CampaignEventsHandler(
      campaignRepo as never,
      recipientRepo as never,
      { emit: jest.fn() } as never,
      { emitToOrg: jest.fn() } as never,
      { publishOnce: jest.fn() } as never,
    );
    const event = {
      messageId: 'message-1',
      orgId: 'org-1',
      reason: 'No active connection',
      retryCount: 3,
    };

    await Promise.all([
      handler.handleMessageFailed({ ...event, sessionId: 'session-1', retryCount: 3 }),
      handler.handleMessageDeadLettered(event),
    ]);

    expect(recipientRepo.markFailedIfActive).toHaveBeenCalledTimes(2);
    expect(campaignRepo.incrementCounter).toHaveBeenCalledTimes(1);
    expect(campaignRepo.incrementCounter).toHaveBeenCalledWith('campaign-1', 'failedCount', 1);
  });

  it('does not advance a campaign while a WhatsApp send is retrying', async () => {
    const recipientRepo = { findByMessageId: jest.fn().mockResolvedValue({ id: 'recipient-1', campaignId: 'campaign-1' }) };
    const queueService = { publishOnce: jest.fn() };
    const handler = new CampaignEventsHandler(
      { incrementCounter: jest.fn(), findById: jest.fn() } as never,
      recipientRepo as never,
      { emit: jest.fn() } as never,
      { emitToOrg: jest.fn() } as never,
      queueService as never,
    );

    await handler.handleMessageFailed({
      messageId: 'message-1',
      orgId: 'org-1',
      sessionId: 'session-1',
      reason: 'Temporary provider error',
      retryCount: 1,
    });

    expect(queueService.publishOnce).not.toHaveBeenCalled();
  });

  it('schedules the next recipient after a successful WhatsApp send', async () => {
    const recipientRepo = {
      findByMessageId: jest.fn().mockResolvedValue({ id: 'recipient-1', campaignId: 'campaign-1', batchNumber: 2 }),
      updateStatusIfCurrent: jest.fn().mockResolvedValue(true),
      countByStatus: jest.fn().mockResolvedValue({ pending: 1, queued: 0 }),
      hasQueuedRecipients: jest.fn().mockResolvedValue(false),
    };
    const queueService = { publishOnce: jest.fn() };
    const campaignRepo = {
      incrementCounter: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'campaign-1',
        orgId: 'org-1',
        sessionId: null,
        status: CampaignStatus.RUNNING,
        totalRecipients: 2,
        sentCount: 1,
        deliveredCount: 0,
        failedCount: 0,
        readCount: 0,
      }),
    };
    const handler = new CampaignEventsHandler(
      campaignRepo as never,
      recipientRepo as never,
      { emit: jest.fn() } as never,
      { emitToOrg: jest.fn() } as never,
      queueService as never,
    );

    await handler.handleMessageSent({
      messageId: 'message-1',
      orgId: 'org-1',
      sessionId: 'session-1',
      contactPhone: '+15555550123',
      whatsappMessageId: 'whatsapp-1',
    });

    expect(queueService.publishOnce).toHaveBeenCalledWith(
      expect.any(String),
      { campaignId: 'campaign-1', orgId: 'org-1', batchNumber: 2 },
      'campaign-next-recipient-campaign-1-2-recipient-1',
    );
    expect(recipientRepo.hasQueuedRecipients).toHaveBeenCalledWith('campaign-1', 2);
  });

  it('advances only the failed recipient batch after terminal failure', async () => {
    const recipientRepo = {
      findByMessageId: jest.fn().mockResolvedValue({
        id: 'recipient-7',
        campaignId: 'campaign-1',
        batchNumber: 4,
      }),
      markFailedIfActive: jest.fn().mockResolvedValue(true),
      countByStatus: jest.fn().mockResolvedValue({ pending: 99, queued: 0 }),
      hasQueuedRecipients: jest.fn().mockResolvedValue(false),
    };
    const queueService = { publishOnce: jest.fn() };
    const campaignRepo = {
      incrementCounter: jest.fn(),
      findById: jest.fn().mockResolvedValue({
        id: 'campaign-1',
        orgId: 'org-1',
        status: CampaignStatus.RUNNING,
        totalRecipients: 400,
        sentCount: 0,
        deliveredCount: 0,
        failedCount: 1,
        readCount: 0,
      }),
    };
    const handler = new CampaignEventsHandler(
      campaignRepo as never,
      recipientRepo as never,
      { emit: jest.fn() } as never,
      { emitToOrg: jest.fn() } as never,
      queueService as never,
    );

    await handler.handleMessageDeadLettered({
      messageId: 'message-7',
      orgId: 'org-1',
      reason: 'Session disconnected',
      retryCount: 3,
    });

    expect(queueService.publishOnce).toHaveBeenCalledWith(
      expect.any(String),
      { campaignId: 'campaign-1', orgId: 'org-1', batchNumber: 4 },
      'campaign-next-recipient-campaign-1-4-recipient-7',
    );
  });
});
