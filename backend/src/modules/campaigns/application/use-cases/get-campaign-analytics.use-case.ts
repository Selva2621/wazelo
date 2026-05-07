import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';

@Injectable()
export class GetCampaignAnalyticsUseCase {
  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
  ) {}

  async execute(campaignId: string, orgId: string) {
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    const recipientCounts = await this.recipientRepo.countByStatus(campaignId);

    const totalProcessed =
      recipientCounts.sent +
      recipientCounts.delivered +
      recipientCounts.failed +
      recipientCounts.skipped;

    const deliveryRate =
      campaign.totalRecipients > 0
        ? ((recipientCounts.delivered / campaign.totalRecipients) * 100).toFixed(2)
        : '0.00';

    const failureRate =
      campaign.totalRecipients > 0
        ? ((recipientCounts.failed / campaign.totalRecipients) * 100).toFixed(2)
        : '0.00';

    const readRate =
      recipientCounts.delivered > 0
        ? ((campaign.readCount / recipientCounts.delivered) * 100).toFixed(2)
        : '0.00';

    return {
      campaignId: campaign.id,
      name: campaign.name,
      status: campaign.status,
      startedAt: campaign.startedAt,
      completedAt: campaign.completedAt,
      metrics: {
        totalRecipients: campaign.totalRecipients,
        sent: campaign.sentCount,
        delivered: campaign.deliveredCount,
        failed: campaign.failedCount,
        read: campaign.readCount,
        skipped: recipientCounts.skipped,
        pending: recipientCounts.pending,
        queued: recipientCounts.queued,
      },
      rates: {
        deliveryRate: parseFloat(deliveryRate),
        failureRate: parseFloat(failureRate),
        readRate: parseFloat(readRate),
      },
      progress: {
        processed: totalProcessed,
        remaining: recipientCounts.pending + recipientCounts.queued,
        percentComplete:
          campaign.totalRecipients > 0
            ? parseFloat(
                ((totalProcessed / campaign.totalRecipients) * 100).toFixed(2),
              )
            : 0,
      },
    };
  }
}
