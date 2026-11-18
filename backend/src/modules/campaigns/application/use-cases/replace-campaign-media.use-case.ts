import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { AuditAction, CampaignStatus } from '@prisma/client';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { isLocalMediaMissing } from '@/infrastructure/storage/local-media';
import { ReplaceCampaignMediaDto } from '../dto/replace-campaign-media.dto';

/** Not finished yet, so there is still something to send with the new file. */
const REPLACEABLE_IN: CampaignStatus[] = [CampaignStatus.PAUSED, CampaignStatus.SCHEDULED];

/** Which mime family each media message type accepts (documents take anything). */
const MIME_FAMILY: Record<string, string> = { IMAGE: 'image/', VIDEO: 'video/', AUDIO: 'audio/' };

/**
 * Replace the image / video / file of a paused or scheduled campaign, e.g. when
 * a server restart cleared the uploaded original. Recipients not sent yet get
 * the new file; the campaign keeps its message type and everything else.
 */
@Injectable()
export class ReplaceCampaignMediaUseCase {
  private readonly logger = new Logger(ReplaceCampaignMediaUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    campaignId: string,
    orgId: string,
    userId: string,
    dto: ReplaceCampaignMediaDto,
    ipAddress: string,
    userAgent: string,
  ) {
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) throw new NotFoundException('Campaign not found');

    if (campaign.messageType === 'TEXT' || campaign.messageType === 'INTERACTIVE') {
      throw new BadRequestException("This campaign doesn't send media");
    }
    if (!REPLACEABLE_IN.includes(campaign.status)) {
      throw new BadRequestException(
        campaign.status === CampaignStatus.DRAFT
          ? 'Edit the draft to change its media'
          : 'Pause the campaign first, then replace its media',
      );
    }

    const family = MIME_FAMILY[campaign.messageType];
    if (family && dto.mediaMimeType && !dto.mediaMimeType.startsWith(family)) {
      throw new BadRequestException(`This is a ${campaign.messageType.toLowerCase()} campaign: upload a ${family.slice(0, -1)} file`);
    }
    if (isLocalMediaMissing(dto.mediaUrl)) {
      throw new BadRequestException('That file is not on the server. Upload it again.');
    }

    const updated = await this.campaignRepo.replaceMedia(
      campaignId,
      orgId,
      REPLACEABLE_IN,
      dto.mediaUrl,
      dto.mediaMimeType ?? null,
    );
    if (!updated) throw new BadRequestException('Campaign status has already changed. Refresh and try again.');

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CAMPAIGN_UPDATED,
      targetType: 'Campaign',
      targetId: campaignId,
      metadata: { changes: { mediaUrl: dto.mediaUrl, mediaMimeType: dto.mediaMimeType }, reason: 'media replaced' },
      ipAddress,
      userAgent,
    });
    this.logger.log(`Campaign ${campaignId} media replaced by user ${userId}`);
    return updated;
  }
}
