import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { isLocalMediaMissing } from '@/infrastructure/storage/local-media';

@Injectable()
export class GetCampaignUseCase {
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
    // Failed only because the number's connection was down: a retry sends these again
    const retryableFailedCount =
      campaign.channel !== 'EMAIL' && recipientCounts.failed > 0
        ? await this.recipientRepo.countConnectionFailures(campaignId)
        : 0;

    return {
      ...campaign,
      failedCount: recipientCounts.failed,
      recipientCounts,
      retryableFailedCount,
      // Uploaded media cleared by a server restart: it must be replaced to send
      mediaMissing: isLocalMediaMissing(campaign.mediaUrl),
    };
  }
}
