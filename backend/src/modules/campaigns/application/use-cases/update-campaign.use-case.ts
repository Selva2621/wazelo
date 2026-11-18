import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateCampaignDto } from '../dto/update-campaign.dto';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction } from '@prisma/client';
import { assertNoUnknownPlaceholders, resolveCampaignTemplate } from './create-campaign.use-case';
import { PrismaService } from '@/infrastructure/database/prisma.service';

@Injectable()
export class UpdateCampaignUseCase {
  private readonly logger = new Logger(UpdateCampaignUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async execute(
    campaignId: string,
    orgId: string,
    userId: string,
    dto: UpdateCampaignDto,
    ipAddress: string,
    userAgent: string,
  ) {
    // 1. Verify campaign exists and belongs to org
    const campaign = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }

    // 2. Only DRAFT campaigns can be updated
    if (campaign.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft campaigns can be updated. Current status: ' + campaign.status,
      );
    }

    // 3. Validate session if changed
    if (dto.sessionId && dto.sessionId !== campaign.sessionId) {
      const session = await this.sessionRepo.findByIdAndOrg(dto.sessionId, orgId);
      if (!session) {
        throw new BadRequestException('WhatsApp session not found');
      }
    }

    // Official numbers send an approved template: switching to one (or a new one) on a draft
    const currentMeta = (campaign.metadata as Record<string, unknown> | null) ?? {};
    let metadata: Record<string, unknown> | undefined;
    if (dto.cloudTemplateId) {
      const resolved = await resolveCampaignTemplate(this.prisma, orgId, {
        cloudTemplateId: dto.cloudTemplateId,
        cloudTemplateParams: dto.cloudTemplateParams,
        cloudTemplateHeaderImageUrl: dto.cloudTemplateHeaderImageUrl,
      });
      dto.messageType = 'TEXT';
      dto.messageBody = resolved.messageBody;
      metadata = { ...currentMeta, cloudTemplate: resolved.cloudTemplate };
    } else if (dto.sessionId && !currentMeta.cloudTemplate) {
      // Moving a plain-text draft to an official number needs a template too
      const [official] = await this.sessionRepo.findCloudIdsAmong([dto.sessionId], orgId);
      if (official) {
        throw new BadRequestException('Official WhatsApp numbers need an approved template. Pick one too.');
      }
    }

    // 4. Validate message content consistency
    const messageType = dto.messageType || campaign.messageType;
    const messageBody = dto.messageBody !== undefined ? dto.messageBody : campaign.messageBody;
    const mediaUrl = dto.mediaUrl !== undefined ? dto.mediaUrl : campaign.mediaUrl;

    if (messageType === 'TEXT' && !messageBody) {
      throw new BadRequestException('Text campaigns require a messageBody');
    }
    if (['IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'].includes(messageType) && !mediaUrl) {
      throw new BadRequestException(`${messageType} campaigns require a mediaUrl`);
    }
    assertNoUnknownPlaceholders(messageBody);

    // 5. Update
    const updated = await this.campaignRepo.updateDraft(campaignId, orgId, {
      name: dto.name,
      description: dto.description,
      messageType: dto.messageType,
      messageBody: dto.messageBody,
      mediaUrl: dto.mediaUrl,
      mediaMimeType: dto.mediaMimeType,
      audienceType: dto.audienceType,
      audienceFilters: dto.audienceFilters as Record<string, unknown>,
      sessionId: dto.sessionId,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
      timezone: dto.timezone,
      ...(metadata && { metadata }),
    });

    if (!updated) {
      throw new BadRequestException('Campaign could not be updated (status may have changed)');
    }

    // 6. Emit + audit
    this.eventEmitter.emit(EVENT_NAMES.CAMPAIGN_UPDATED, {
      campaignId,
      orgId,
      updatedById: userId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CAMPAIGN_UPDATED,
      targetType: 'Campaign',
      targetId: campaignId,
      metadata: { changes: dto },
      ipAddress,
      userAgent,
    });

    this.logger.log(`Campaign ${campaignId} updated by user ${userId}`);

    return updated;
  }
}
