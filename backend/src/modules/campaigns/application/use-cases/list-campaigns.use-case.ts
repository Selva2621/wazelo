import { Injectable } from '@nestjs/common';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { ListCampaignsQueryDto } from '../dto/list-campaigns-query.dto';

@Injectable()
export class ListCampaignsUseCase {
  constructor(private readonly campaignRepo: CampaignRepository) {}

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

    return {
      data: campaigns,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
