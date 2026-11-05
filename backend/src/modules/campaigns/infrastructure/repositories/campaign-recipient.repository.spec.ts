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
