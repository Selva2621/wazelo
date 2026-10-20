import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CampaignStatus } from '@prisma/client';
import { CampaignRepository } from '../../infrastructure/repositories/campaign.repository';
import { CreateCampaignDto } from '../dto/create-campaign.dto';
import { CreateCampaignUseCase } from './create-campaign.use-case';
import { ExecuteCampaignUseCase } from './execute-campaign.use-case';

const FINISHED: CampaignStatus[] = [
  CampaignStatus.COMPLETED,
  CampaignStatus.FAILED,
  CampaignStatus.CANCELLED,
];

/** "Offer (rerun)" stays "Offer (rerun)" on the next rerun instead of piling up suffixes */
export function rerunName(name: string): string {
  return `${name.replace(/\s*\(rerun\)$/i, '')} (rerun)`;
}

/**
 * Runs a finished campaign again as a new campaign: same message, audience, sender
 * and product, audience resolved afresh. The original keeps its report untouched.
 */
@Injectable()
export class RerunCampaignUseCase {
  private readonly logger = new Logger(RerunCampaignUseCase.name);

  constructor(
    private readonly campaignRepo: CampaignRepository,
    private readonly createCampaign: CreateCampaignUseCase,
    private readonly executeCampaign: ExecuteCampaignUseCase,
  ) {}

  async execute(campaignId: string, orgId: string, userId: string, ipAddress: string, userAgent: string) {
    const source = await this.campaignRepo.findByIdAndOrg(campaignId, orgId);
    if (!source) throw new NotFoundException('Campaign not found');
    if (!FINISHED.includes(source.status)) {
      throw new BadRequestException('Only completed, failed or cancelled campaigns can be run again');
    }

    const dto = {
      name: rerunName(source.name),
      description: source.description ?? undefined,
      sessionId: source.sessionId,
      messageType: source.messageType,
      messageBody: source.messageBody ?? undefined,
      mediaUrl: source.mediaUrl ?? undefined,
      mediaMimeType: source.mediaMimeType ?? undefined,
      audienceType: source.audienceType,
      audienceFilters: (source.audienceFilters as Record<string, unknown> | null) ?? undefined,
      timezone: source.timezone ?? undefined,
      productId: source.productId ?? undefined,
    } as CreateCampaignDto;

    const { campaign } = await this.createCampaign.execute(orgId, userId, dto, ipAddress, userAgent);
    const started = await this.executeCampaign.execute(campaign.id, orgId, userId, ipAddress, userAgent);

    this.logger.log(`Campaign ${campaignId} rerun as ${campaign.id} by user ${userId}`);
    return started ?? campaign;
  }
}
