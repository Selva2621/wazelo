import { CampaignRecipientStatus } from '@prisma/client';
import { CampaignRecipientRepository } from './campaign-recipient.repository';

describe('CampaignRecipientRepository', () => {
  it('stores the assigned WhatsApp session on each recipient', async () => {
    const createMany = jest.fn().mockResolvedValue({ count: 1 });
    const repository = new CampaignRecipientRepository({
      campaignRecipient: { createMany },
    } as never);

    await repository.bulkCreate([{
      campaignId: 'campaign-1',
      orgId: 'org-1',
      contactId: 'contact-1',
      contactPhone: '+15555550123',
      batchNumber: 2,
      sessionId: 'session-2',
    }]);

    expect(createMany).toHaveBeenCalledWith({
      data: [{
        campaignId: 'campaign-1',
        orgId: 'org-1',
        contactId: 'contact-1',
        contactPhone: '+15555550123',
        batchNumber: 2,
        sessionId: 'session-2',
        status: CampaignRecipientStatus.PENDING,
      }],
      skipDuplicates: true,
    });
  });

  it('aggregates recipient progress and session state by batch', async () => {
    const groupBy = jest
      .fn()
      .mockResolvedValueOnce([
        {
          batchNumber: 1,
          sessionId: 'session-1',
          status: CampaignRecipientStatus.SENT,
          _count: { id: 2 },
        },
        {
          batchNumber: 1,
          sessionId: 'session-1',
          status: CampaignRecipientStatus.PENDING,
          _count: { id: 1 },
        },
        {
          batchNumber: 1,
          sessionId: 'session-1',
          status: CampaignRecipientStatus.FAILED,
          _count: { id: 1 },
        },
      ])
      .mockResolvedValueOnce([
        {
          batchNumber: 1,
          sessionId: 'session-1',
          failedReason: 'Session not connected',
          _count: { id: 1 },
        },
      ]);
    const session = {
      id: 'session-1',
      phoneNumber: '+15555550123',
      status: 'CONNECTED',
      lastHeartbeatAt: new Date(),
      sendingPausedUntil: null,
      sendingPausedReason: null,
    };
    const findMany = jest.fn().mockResolvedValue([session]);
    const repository = new CampaignRecipientRepository({
      campaignRecipient: { groupBy },
      whatsAppSession: { findMany },
    } as never);

    await expect(repository.getBatchProgress('campaign-1')).resolves.toEqual([
      {
        batchNumber: 1,
        sessionId: 'session-1',
        sessionPhoneNumber: '+15555550123',
        sessionStatus: 'CONNECTED',
        lastHeartbeatAt: session.lastHeartbeatAt,
        sendingPausedUntil: null,
        sendingPausedReason: null,
        counts: {
          pending: 1,
          queued: 0,
          sent: 2,
          delivered: 0,
          failed: 1,
          skipped: 0,
        },
        failureReasons: [{ reason: 'Session not connected', count: 1 }],
      },
    ]);
    expect(groupBy).toHaveBeenCalledTimes(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: ['session-1'] } } }),
    );
  });

  it('claims a single pending recipient when no recipient is already queued', async () => {
    const recipient = {
      id: 'recipient-1',
      campaignId: 'campaign-1',
      status: CampaignRecipientStatus.PENDING,
    };
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(recipient);
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const transaction = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      campaignRecipient: { findFirst, updateMany },
    };
    const prisma = {
      $transaction: jest.fn((callback: (tx: typeof transaction) => unknown) => callback(transaction)),
    };
    const repository = new CampaignRecipientRepository(prisma as never);

    await expect(repository.claimNextPending('campaign-1', 2)).resolves.toEqual({
      ...recipient,
      status: CampaignRecipientStatus.QUEUED,
    });
    expect(transaction.$queryRaw).toHaveBeenCalledTimes(1);
    const lockQuery = transaction.$queryRaw.mock.calls[0][0] as TemplateStringsArray;
    expect(lockQuery.join('?')).toContain(
      'SELECT 1 AS acquired FROM (SELECT pg_advisory_xact_lock(hashtext(?), ?::integer)) AS batch_lock',
    );

    expect(findFirst).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ where: { campaignId: 'campaign-1', batchNumber: 2, status: CampaignRecipientStatus.QUEUED } }),
    );
    expect(findFirst).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { campaignId: 'campaign-1', batchNumber: 2, status: CampaignRecipientStatus.PENDING },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      }),
    );
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: 'recipient-1', status: CampaignRecipientStatus.PENDING },
      data: { status: CampaignRecipientStatus.QUEUED },
    });
  });

  it('does not claim a second recipient while a send is queued', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'in-flight-recipient' });
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({ $queryRaw: jest.fn().mockResolvedValue([]), campaignRecipient: { findFirst, updateMany: jest.fn() } }),
      ),
    };
    const repository = new CampaignRecipientRepository(prisma as never);

    await expect(repository.claimNextPending('campaign-1', 3)).resolves.toBeNull();
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { campaignId: 'campaign-1', batchNumber: 3, status: CampaignRecipientStatus.QUEUED } }),
    );
  });

  it('finds queued WhatsApp messages so resume can wake delayed campaign sends', async () => {
    const findMany = jest.fn().mockResolvedValue([
      { messageId: 'message-1', sessionId: 'session-1' },
      { messageId: null, sessionId: 'session-2' },
    ]);
    const repository = new CampaignRecipientRepository({
      campaignRecipient: { findMany },
    } as never);

    await expect(repository.findQueuedMessages('campaign-1')).resolves.toEqual([
      { messageId: 'message-1', sessionId: 'session-1' },
    ]);
    expect(findMany).toHaveBeenCalledWith({
      where: {
        campaignId: 'campaign-1',
        status: CampaignRecipientStatus.QUEUED,
        messageId: { not: null },
      },
      select: { messageId: true, sessionId: true },
    });
  });

  it('does not claim another recipient if a concurrent pump wins the pending row', async () => {
    const recipient = {
      id: 'recipient-1',
      status: CampaignRecipientStatus.PENDING,
    };
    const findFirst = jest.fn().mockResolvedValueOnce(null).mockResolvedValueOnce(recipient);
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
        callback({ $queryRaw: jest.fn().mockResolvedValue([]), campaignRecipient: { findFirst, updateMany } }),
      ),
    };
    const repository = new CampaignRecipientRepository(prisma as never);

    await expect(repository.claimNextPending('campaign-1', 1)).resolves.toBeNull();
  });

  it('only marks an active recipient failed once', async () => {
    const updateMany = jest
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });
    const repository = new CampaignRecipientRepository({
      campaignRecipient: { updateMany },
    } as never);

    await expect(repository.markFailedIfActive('recipient-1', 'No active connection')).resolves.toBe(true);
    await expect(repository.markFailedIfActive('recipient-1', 'No active connection')).resolves.toBe(false);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'recipient-1',
          status: { in: [CampaignRecipientStatus.PENDING, CampaignRecipientStatus.QUEUED] },
        },
        data: expect.objectContaining({
          status: CampaignRecipientStatus.FAILED,
          failedReason: 'No active connection',
        }),
      }),
    );
  });
});
