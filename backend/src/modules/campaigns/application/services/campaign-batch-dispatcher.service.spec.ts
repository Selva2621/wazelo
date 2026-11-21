import { CampaignRecipientStatus, MessageStatus } from '@prisma/client';
import { QUEUE_NAMES } from '@/common/constants';
import { CampaignBatchDispatcher } from './campaign-batch-dispatcher.service';

function setup(overrides: Record<string, jest.Mock> = {}) {
  const recipientRepo = {
    getBatchWorkSummary: jest.fn().mockResolvedValue([]),
    findStaleQueued: jest.fn().mockResolvedValue([]),
    updateStatusIfCurrent: jest.fn().mockResolvedValue(true),
    markFailedIfActive: jest.fn().mockResolvedValue(true),
    requeueStuck: jest.fn().mockResolvedValue(true),
    ...overrides,
  };
  const campaignRepo = { incrementCounter: jest.fn() };
  const queueService = { publishOnce: jest.fn().mockResolvedValue('job') };
  const dispatcher = new CampaignBatchDispatcher(
    recipientRepo as never,
    campaignRepo as never,
    queueService as never,
  );
  return { dispatcher, recipientRepo, campaignRepo, queueService };
}

describe('CampaignBatchDispatcher', () => {
  describe('dispatch', () => {
    it('publishes one batch per WhatsApp number, lowest first', async () => {
      const { dispatcher, queueService } = setup({
        getBatchWorkSummary: jest.fn().mockResolvedValue([
          { batchNumber: 1, sessionId: 'A', pending: 100, queued: 0 },
          { batchNumber: 2, sessionId: 'B', pending: 100, queued: 0 },
          { batchNumber: 3, sessionId: 'A', pending: 100, queued: 0 },
        ]),
      });

      await expect(dispatcher.dispatch('c1', 'o1', 'WHATSAPP')).resolves.toEqual([1, 2]);
      expect(queueService.publishOnce).toHaveBeenCalledTimes(2);
      expect(queueService.publishOnce).toHaveBeenCalledWith(
        QUEUE_NAMES.CAMPAIGN_BATCH,
        { campaignId: 'c1', orgId: 'o1', batchNumber: 1 },
        'campaign-batch-c1-1',
      );
    });

    it('publishes every email batch', async () => {
      const { dispatcher } = setup({
        getBatchWorkSummary: jest.fn().mockResolvedValue([
          { batchNumber: 1, sessionId: null, pending: 10, queued: 0 },
          { batchNumber: 2, sessionId: null, pending: 10, queued: 0 },
        ]),
      });
      await expect(dispatcher.dispatch('c1', 'o1', 'EMAIL')).resolves.toEqual([1, 2]);
    });
  });

  describe('repairStuckRecipients', () => {
    it('records a sent outcome whose event was missed and kicks the batch', async () => {
      const { dispatcher, recipientRepo, campaignRepo, queueService } = setup({
        findStaleQueued: jest.fn().mockResolvedValue([
          { id: 'r1', batchNumber: 2, messageId: 'm1', emailMessageId: null, message: { status: MessageStatus.DELIVERED, failedReason: null } },
        ]),
      });

      await expect(dispatcher.repairStuckRecipients('c1', 'o1')).resolves.toBe(1);
      expect(recipientRepo.updateStatusIfCurrent).toHaveBeenCalledWith(
        'r1', CampaignRecipientStatus.QUEUED, CampaignRecipientStatus.DELIVERED, expect.any(Object),
      );
      expect(campaignRepo.incrementCounter).toHaveBeenCalledWith('c1', 'sentCount', 1);
      expect(campaignRepo.incrementCounter).toHaveBeenCalledWith('c1', 'deliveredCount', 1);
      expect(queueService.publishOnce).toHaveBeenCalledWith(
        QUEUE_NAMES.CAMPAIGN_BATCH,
        { campaignId: 'c1', orgId: 'o1', batchNumber: 2 },
        expect.stringMatching(/^campaign-batch-repair-c1-2-/),
      );
    });

    it('marks a recipient failed when its message failed', async () => {
      const { dispatcher, recipientRepo, campaignRepo } = setup({
        findStaleQueued: jest.fn().mockResolvedValue([
          { id: 'r1', batchNumber: 1, messageId: 'm1', emailMessageId: null, message: { status: MessageStatus.FAILED, failedReason: 'Number not on WhatsApp' } },
        ]),
      });
      await dispatcher.repairStuckRecipients('c1', 'o1');
      expect(recipientRepo.markFailedIfActive).toHaveBeenCalledWith('r1', 'Number not on WhatsApp');
      expect(campaignRepo.incrementCounter).toHaveBeenCalledWith('c1', 'failedCount', 1);
    });

    it('puts a recipient claimed before a crash (no message) back to pending', async () => {
      const { dispatcher, recipientRepo } = setup({
        findStaleQueued: jest.fn().mockResolvedValue([
          { id: 'r1', batchNumber: 1, messageId: null, emailMessageId: null, message: null },
        ]),
      });
      await expect(dispatcher.repairStuckRecipients('c1', 'o1')).resolves.toBe(1);
      expect(recipientRepo.requeueStuck).toHaveBeenCalledWith('r1');
    });

    it('leaves messages that are still queued or held alone', async () => {
      const { dispatcher, recipientRepo, queueService } = setup({
        findStaleQueued: jest.fn().mockResolvedValue([
          { id: 'r1', batchNumber: 1, messageId: 'm1', emailMessageId: null, message: { status: MessageStatus.QUEUED, failedReason: null } },
          { id: 'r2', batchNumber: 1, messageId: 'm2', emailMessageId: null, message: { status: MessageStatus.PROCESSING, failedReason: null } },
        ]),
      });
      await expect(dispatcher.repairStuckRecipients('c1', 'o1')).resolves.toBe(0);
      expect(recipientRepo.requeueStuck).not.toHaveBeenCalled();
      expect(queueService.publishOnce).not.toHaveBeenCalled();
    });

    it('does not double count when another handler already settled the recipient', async () => {
      const { dispatcher, campaignRepo } = setup({
        findStaleQueued: jest.fn().mockResolvedValue([
          { id: 'r1', batchNumber: 1, messageId: 'm1', emailMessageId: null, message: { status: MessageStatus.SENT, failedReason: null } },
        ]),
        updateStatusIfCurrent: jest.fn().mockResolvedValue(false),
      });
      await expect(dispatcher.repairStuckRecipients('c1', 'o1')).resolves.toBe(0);
      expect(campaignRepo.incrementCounter).not.toHaveBeenCalled();
    });
  });
});
