import { Injectable } from '@nestjs/common';
import { AudienceResolverService } from '../../domain/services/audience-resolver.service';
import { AudienceFiltersDto } from '../dto/create-campaign.dto';
import { CampaignAudienceType } from '@prisma/client';
import { CAMPAIGN_CONFIG } from '@/common/constants';

@Injectable()
export class PreviewAudienceUseCase {
  constructor(private readonly audienceResolver: AudienceResolverService) {}

  async execute(
    orgId: string,
    audienceType: CampaignAudienceType,
    filters?: AudienceFiltersDto,
    /** Email: only contacts with an email who haven't unsubscribed from email */
    channel: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP',
  ) {
    const count = await this.audienceResolver.previewAudienceCount(
      orgId,
      audienceType,
      filters,
      channel,
    );

    return {
      estimatedRecipients: count,
      batchSize: CAMPAIGN_CONFIG.BATCH_SIZE,
      maxRecipients: CAMPAIGN_CONFIG.MAX_RECIPIENTS,
    };
  }
}
