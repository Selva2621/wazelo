import { Injectable } from '@nestjs/common';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { ListCampaignsQueryDto } from '../dto/list-campaigns-query.dto';

@Injectable()
export class ListCampaignsUseCase {
  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly recipientRepo: CampaignRecipientRepository,
  ) {}

  async execute(orgId: string, query: ListCampaignsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const { campaigns, total } = await this.campaignRepo.findByOrgPaginated(
      orgId,
      {
        take: limit,
        skip: (page - 1) * limit,
        status: query.status,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      },
    );

    const recipientCounts = await this.recipientRepo.countByStatusForCampaigns(
      campaigns.map((campaign) => campaign.id),
    );

    return {
      data: campaigns.map((campaign) => {
        const counts = recipientCounts.get(campaign.id);
        return {
          ...campaign,
          processedRecipientCount: counts
            ? counts.sent + counts.delivered + counts.failed + counts.skipped
            : 0,
        };
      }),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
