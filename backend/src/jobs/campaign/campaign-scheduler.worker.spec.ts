import { QUEUE_NAMES } from '@/common/constants';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignBatchDispatcher } from '@/modules/campaigns/application/services/campaign-batch-dispatcher.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import { CampaignSchedulerWorker } from './campaign-scheduler.worker';

describe('CampaignSchedulerWorker', () => {
  it('repairs stuck recipients then dispatches running campaigns through the dispatcher', async () => {
    const campaign = { id: 'campaign-1', orgId: 'org-1', channel: 'WHATSAPP' };
    const queueService = {
      publishOnce: jest.fn().mockResolvedValue('job-1'),
      publishDelayed: jest.fn().mockResolvedValue('scheduler-job'),
    };
    const campaignRepo = {
      findScheduledCampaigns: jest.fn().mockResolvedValue([]),
      findRunningCampaigns: jest.fn().mockResolvedValue([campaign]),
    };
    const calls: string[] = [];
    const dispatcher = {
      repairStuckRecipients: jest.fn().mockImplementation(async () => { calls.push('repair'); return 0; }),
      dispatch: jest.fn().mockImplementation(async () => { calls.push('dispatch'); return [1]; }),
    };
    const worker = new CampaignSchedulerWorker(
      queueService as unknown as QueueService,
      campaignRepo as unknown as CampaignRepository,
      { isDisabled: jest.fn().mockResolvedValue(false) } as unknown as KillSwitchService,
      dispatcher as unknown as CampaignBatchDispatcher,
    );

    await (
      worker as unknown as { checkScheduledCampaigns: () => Promise<void> }
    ).checkScheduledCampaigns();

    expect(calls).toEqual(['repair', 'dispatch']);
    expect(dispatcher.dispatch).toHaveBeenCalledWith('campaign-1', 'org-1', 'WHATSAPP');
    expect(queueService.publishDelayed).toHaveBeenCalledWith(
      QUEUE_NAMES.CAMPAIGN_SCHEDULE_CHECK,
      {},
      expect.any(Number),
      { singletonKey: 'campaign-schedule-check' },
    );
  });

  it('keeps checking other campaigns when one fails', async () => {
    const queueService = { publishOnce: jest.fn(), publishDelayed: jest.fn() };
    const campaignRepo = {
      findScheduledCampaigns: jest.fn().mockResolvedValue([]),
      findRunningCampaigns: jest.fn().mockResolvedValue([
        { id: 'bad', orgId: 'org-1', channel: 'WHATSAPP' },
        { id: 'good', orgId: 'org-1', channel: 'WHATSAPP' },
      ]),
    };
    const dispatcher = {
      repairStuckRecipients: jest.fn().mockImplementation(async (id: string) => {
        if (id === 'bad') throw new Error('boom');
        return 0;
      }),
      dispatch: jest.fn().mockResolvedValue([]),
    };
    const worker = new CampaignSchedulerWorker(
      queueService as unknown as QueueService,
      campaignRepo as unknown as CampaignRepository,
      { isDisabled: jest.fn().mockResolvedValue(false) } as unknown as KillSwitchService,
      dispatcher as unknown as CampaignBatchDispatcher,
    );

    await (
      worker as unknown as { checkScheduledCampaigns: () => Promise<void> }
    ).checkScheduledCampaigns();

    expect(dispatcher.dispatch).toHaveBeenCalledTimes(1);
    expect(dispatcher.dispatch).toHaveBeenCalledWith('good', 'org-1', 'WHATSAPP');
  });
});
