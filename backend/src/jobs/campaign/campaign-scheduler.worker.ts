import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { CampaignRepository } from '@/modules/campaigns/infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '@/modules/campaigns/infrastructure/repositories/campaign-recipient.repository';
import { KillSwitchService } from '@/modules/billing/domain/services/kill-switch.service';
import {
  QUEUE_NAMES,
  CAMPAIGN_CONFIG,
} from '@/common/constants';

/**
 * CampaignSchedulerWorker
 *
 * Periodically checks for scheduled campaigns that are due for execution.
 * Acts as a safety net alongside pg-boss delayed jobs — if the delayed job
 * fires correctly, the scheduler finds no matching campaigns. If the delayed
 * job is lost (e.g., due to restart), the scheduler picks it up.
 *
 * Uses pg-boss `schedule()` for cron-like periodic execution.
 */
@Injectable()
export class CampaignSchedulerWorker implements OnModuleInit {
  private readonly logger = new Logger(CampaignSchedulerWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly killSwitches: KillSwitchService,
  ) {}

  async onModuleInit(): Promise<void> {
    // Subscribe to the schedule-check queue
    await this.queueService.subscribe<Record<string, never>>(
      QUEUE_NAMES.CAMPAIGN_SCHEDULE_CHECK,
      async () => this.checkScheduledCampaigns(),
    );

    // Kick off the self-re-queuing periodic check loop
    await this.scheduleNextCheck();

    this.logger.log(
      `CampaignSchedulerWorker started (interval=${CAMPAIGN_CONFIG.SCHEDULE_CHECK_INTERVAL_SECONDS}s)`,
    );
  }

  private async scheduleNextCheck(): Promise<void> {
    await this.queueService.publishDelayed(
      QUEUE_NAMES.CAMPAIGN_SCHEDULE_CHECK,
      {},
      CAMPAIGN_CONFIG.SCHEDULE_CHECK_INTERVAL_SECONDS,
      { singletonKey: 'campaign-schedule-check' },
    );
  }

  private async checkScheduledCampaigns(): Promise<void> {
    try {
      // Platform kill switch: leave due campaigns SCHEDULED; the first check
      // after the switch is turned off starts them.
      if (await this.killSwitches.isDisabled('campaigns')) {
        this.logger.debug('Campaigns switched off platform-wide — not starting scheduled campaigns');
        return;
      }

      const now = new Date();
      const campaigns = await this.campaignRepo.findScheduledCampaigns(now);

      if (campaigns.length > 0) {
        this.logger.log(`Found ${campaigns.length} scheduled campaign(s) due for execution`);

        for (const campaign of campaigns) {
          try {
            // Publish execution job — let the executor handle status transition
            // Using publishOnce to prevent duplicate execution
            await this.queueService.publishOnce(
              QUEUE_NAMES.CAMPAIGN_EXECUTE,
              {
                campaignId: campaign.id,
                orgId: campaign.orgId,
                sessionId: campaign.sessionId,
                scheduled: true,
              },
              `campaign-exec-${campaign.id}`,
            );

            this.logger.log(`Campaign ${campaign.id} triggered by scheduler safety net`);
          } catch (error) {
            this.logger.error(
              `Failed to trigger campaign ${campaign.id}:`,
              error instanceof Error ? error.stack : String(error),
            );
          }
        }
      }

      await this.recoverRunningCampaigns();
    } finally {
      // Always re-schedule next check
      await this.scheduleNextCheck();
    }
  }

  private async recoverRunningCampaigns(): Promise<void> {
    const campaigns = await this.campaignRepo.findRunningCampaigns();

    for (const campaign of campaigns) {
      try {
        const batchNumbers = await this.recipientRepo.getPendingBatchNumbers(campaign.id);
        for (const batchNumber of batchNumbers) {
          await this.queueService.publishOnce(
            QUEUE_NAMES.CAMPAIGN_BATCH,
            { campaignId: campaign.id, orgId: campaign.orgId, batchNumber },
            `campaign-batch-${campaign.id}-${batchNumber}`,
          );
        }

        if (batchNumbers.length > 0) {
          this.logger.warn(
            `Recovered ${batchNumbers.length} pending batch(es) for running campaign ${campaign.id}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to recover pending batches for campaign ${campaign.id}:`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
