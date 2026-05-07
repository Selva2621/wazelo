import { Injectable, NotFoundException } from '@nestjs/common';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';

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

    return {
      ...campaign,
      recipientCounts,
    };
  }
}
