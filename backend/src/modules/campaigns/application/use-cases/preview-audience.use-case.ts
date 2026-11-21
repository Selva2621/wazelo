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
    const isWhatsApp = channel === 'WHATSAPP';
    const [count, notOnWhatsApp, noWhatsAppPermission] = await Promise.all([
      this.audienceResolver.previewAudienceCount(orgId, audienceType, filters, channel),
      // Explains "3 picked → 2 recipients": numbers a check found aren't on WhatsApp
      isWhatsApp
        ? this.audienceResolver.countNotOnWhatsApp(orgId, audienceType, filters)
        : Promise.resolve(0),
      // Lead finder contacts that haven't messaged the org or agreed: left out
      isWhatsApp
        ? this.audienceResolver.countWithoutWhatsAppPermission(orgId, audienceType, filters)
        : Promise.resolve(0),
    ]);

    return {
      estimatedRecipients: count,
      notOnWhatsApp,
      noWhatsAppPermission,
      batchSize: CAMPAIGN_CONFIG.BATCH_SIZE,
      maxRecipients: CAMPAIGN_CONFIG.MAX_RECIPIENTS,
    };
  }
}
