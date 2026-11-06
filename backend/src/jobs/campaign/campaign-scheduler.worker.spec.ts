import { QUEUE_NAMES } from '@/common/constants';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { CampaignSchedulerWorker } from './campaign-scheduler.worker';

describe('CampaignSchedulerWorker', () => {
  it('re-dispatches pending batches for running campaigns', async () => {
    const campaign = {
      id: 'campaign-1',
      orgId: 'org-1',
    };
    const queueService = {
      publishOnce: jest.fn().mockResolvedValue('job-1'),
      publishDelayed: jest.fn().mockResolvedValue('scheduler-job'),
    };
    const campaignRepo = {
      findScheduledCampaigns: jest.fn().mockResolvedValue([]),
      findRunningCampaigns: jest.fn().mockResolvedValue([campaign]),
    };
    const recipientRepo = {
      getPendingBatchNumbers: jest.fn().mockResolvedValue([1, 3]),
    };
    const worker = new CampaignSchedulerWorker(
      queueService as unknown as QueueService,
      campaignRepo as unknown as CampaignRepository,
      recipientRepo as unknown as CampaignRecipientRepository,
      { isDisabled: jest.fn().mockResolvedValue(false) } as unknown as KillSwitchService,
    );

    await (
      worker as unknown as { checkScheduledCampaigns: () => Promise<void> }
    ).checkScheduledCampaigns();

    expect(queueService.publishOnce).toHaveBeenNthCalledWith(
      1,
      QUEUE_NAMES.CAMPAIGN_BATCH,
      { campaignId: 'campaign-1', orgId: 'org-1', batchNumber: 1 },
      'campaign-batch-campaign-1-1',
    );
    expect(queueService.publishOnce).toHaveBeenNthCalledWith(
      2,
      QUEUE_NAMES.CAMPAIGN_BATCH,
      { campaignId: 'campaign-1', orgId: 'org-1', batchNumber: 3 },
      'campaign-batch-campaign-1-3',
    );
    expect(queueService.publishDelayed).toHaveBeenCalledWith(
      QUEUE_NAMES.CAMPAIGN_SCHEDULE_CHECK,
      {},
      expect.any(Number),
      { singletonKey: 'campaign-schedule-check' },
    );
  });
});
