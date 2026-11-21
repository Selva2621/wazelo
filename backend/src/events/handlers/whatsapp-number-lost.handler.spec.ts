import { CampaignRecipientStatus, CampaignStatus } from '@prisma/client';
import { WhatsAppNumberLostHandler } from './whatsapp-number-lost.handler';

function setup() {
  const prisma = {
    campaign: { findMany: jest.fn().mockResolvedValue([{ id: 'campaign-1' }]) },
    campaignSequence: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
    message: { findMany: jest.fn().mockResolvedValue([]), update: jest.fn() },
    campaignRecipient: { updateMany: jest.fn() },
    sequenceRecipientStep: { findFirst: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn(),
  };
  const campaignRepo = {
    transitionStatus: jest.fn().mockResolvedValue(true),
    recordEvent: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };
  const handler = new WhatsAppNumberLostHandler(prisma as never, campaignRepo as never, eventEmitter as never);
  return { handler, prisma, campaignRepo, eventEmitter };
}

const base = { sessionId: 'session-B', orgId: 'org-1', userId: 'user-1', reason: 'x' };

describe('WhatsAppNumberLostHandler', () => {
  it('pauses campaigns that send any remaining batch from the lost number', async () => {
    const { handler, prisma, campaignRepo } = setup();

    await handler.onNumberLost({ ...base, disconnectReason: 'LOGGED_OUT' });

    const where = prisma.campaign.findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { sessionId: 'session-B' },
      {
        recipients: {
          some: {
            sessionId: 'session-B',
            status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
          },
        },
      },
    ]);
    expect(campaignRepo.transitionStatus).toHaveBeenCalledWith('campaign-1', CampaignStatus.RUNNING, CampaignStatus.PAUSED);
  });

  it('holds every queued message when the number is logged out or banned', async () => {
    const { handler, prisma } = setup();
    await handler.onNumberLost({ ...base, disconnectReason: 'BANNED' });
    expect(prisma.message.findMany.mock.calls[0][0].where.priority).toBeUndefined();
  });

  it('holds only bulk messages on a manual disconnect, leaving inbox replies alone', async () => {
    const { handler, prisma } = setup();
    await handler.onSessionDisconnected({ ...base, reason: 'Manual disconnect' });
    expect(prisma.message.findMany.mock.calls[0][0].where.priority).toEqual({ lt: 0 });
  });

  it('treats an admin force-disconnect like a disconnect', async () => {
    const { handler, prisma, campaignRepo } = setup();
    await handler.onSessionForceDisconnected({ ...base, reason: 'Removed by admin' });
    expect(campaignRepo.transitionStatus).toHaveBeenCalled();
    expect(prisma.message.findMany.mock.calls[0][0].where.priority).toEqual({ lt: 0 });
  });

  it('ignores a disconnect event that is really a lost number (handled by NUMBER_LOST)', async () => {
    const { handler, prisma } = setup();
    await handler.onSessionDisconnected({ ...base, disconnectReason: 'LOGGED_OUT' });
    expect(prisma.campaign.findMany).not.toHaveBeenCalled();
  });
});
