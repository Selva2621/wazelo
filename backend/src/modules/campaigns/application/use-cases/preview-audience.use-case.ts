import { Injectable } from '@nestjs/common';
import { AudienceResolverService } from '../../domain/services/audience-resolver.service';
import { AudienceFiltersDto } from '../dto/create-campaign.dto';
import { CampaignAudienceType } from '@prisma/client';

@Injectable()
export class PreviewAudienceUseCase {
  constructor(private readonly audienceResolver: AudienceResolverService) {}

  async execute(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFiltersDto,
  ) {
    const count = await this.audienceResolver.previewAudienceCount(
      orgId,
      audienceType,
      filters,
    );

    return { estimatedRecipients: count };
  }
}
