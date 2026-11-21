import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { ResumeCampaignUseCase } from './resume-campaign.use-case';

/** Statuses a retry can start from. RUNNING is excluded: it's still sending. */
const RETRYABLE_FROM: CampaignStatus[] = [
  CampaignStatus.PAUSED,
  CampaignStatus.COMPLETED,
  CampaignStatus.FAILED,
];

/**
 * Send again to the recipients whose messages failed only because the WhatsApp
 * connection was down. Works on a finished campaign too: it is reopened as
 * PAUSED and resumed, so the usual resume checks apply (plan limit, a connected
 * number) and it completes again once those recipients settle.
 */
@Injectable()
export class RetryFailedRecipientsUseCase {
  private readonly logger = new Logger(RetryFailedRecipientsUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly resumeCampaign: ResumeCampaignUseCase,
  ) {}

  async execute(campaignId: string, orgId: string, userId: string, ipAddress: string, userAgent: string) {
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) throw new NotFoundException('Campaign not found');
    if (campaign.channel === 'EMAIL') {
      throw new BadRequestException('Retry is only for WhatsApp campaigns');
    }
    if (campaign.status === CampaignStatus.RUNNING) {
      throw new BadRequestException('This campaign is still sending. Retry once it finishes or is paused.');
    }
    if (!RETRYABLE_FROM.includes(campaign.status)) {
      throw new BadRequestException(`A ${campaign.status.toLowerCase()} campaign can't be retried`);
    }

    const retryable = await this.recipientRepo.countConnectionFailures(campaignId);
    if (retryable === 0) {
      throw new BadRequestException(
        'Nothing to retry. The remaining failures (wrong number, not on WhatsApp, blocked) would fail again.',
      );
    }

    if (campaign.status !== CampaignStatus.PAUSED) {
      const reopened = await this.campaignRepo.transitionStatus(campaignId, campaign.status, CampaignStatus.PAUSED, {
        completedAt: null,
      });
      if (!reopened) throw new BadRequestException('Campaign status has already changed. Refresh and try again.');
      await this.campaignRepo.recordEvent({
        campaignId,
        orgId,
        previousStatus: campaign.status,
        newStatus: CampaignStatus.PAUSED,
        triggeredById: userId,
        metadata: { reason: 'Retry failed recipients', retryable },
      });
    }

    // Resume resets the connection-failed recipients and sends them
    const updated = await this.resumeCampaign.execute(campaignId, orgId, userId, ipAddress, userAgent);
    this.logger.log(`Campaign ${campaignId}: retrying ${retryable} failed recipients (by ${userId})`);
    return { campaign: updated, retried: retryable };
  }
}
