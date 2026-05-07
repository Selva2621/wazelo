import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { LeadAdRepository } from '../../infrastructure/repositories/lead-ad.repository';
import { LeadAdsConfigRepository } from '../../infrastructure/repositories/lead-ads-config.repository';
import { GetLeadAdAnalyticsUseCase } from '../../application/use-cases/get-lead-ad-analytics.use-case';
import { ProcessLeadAdUseCase } from '../../application/use-cases/process-lead-ad.use-case';
import { ListLeadAdsQueryDto, LeadAdAnalyticsQueryDto } from '../../application/dto/list-lead-ads-query.dto';
import { SaveLeadAdsConfigDto } from '../../application/dto/save-lead-ads-config.dto';

@Controller('lead-ads')
export class LeadAdsController {
  constructor(
    private readonly leadAdRepo: LeadAdRepository,
    private readonly leadAdsConfigRepo: LeadAdsConfigRepository,
    private readonly analyticsUseCase: GetLeadAdAnalyticsUseCase,
    private readonly processUseCase: ProcessLeadAdUseCase,
    private readonly configService: ConfigService,
  ) {}

  @Get('entries')
  @Permissions(PERMISSIONS.LEAD_ADS_READ)
  async listEntries(
    @CurrentUser('orgId') orgId: string,
    @Query() query: ListLeadAdsQueryDto,
  ) {
    return this.leadAdRepo.list({
      orgId,
      status: query.status,
      platform: query.platform,
      campaignName: query.campaignName,
      search: query.search,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      take: query.take,
      skip: query.skip,
    });
  }

  @Get('entries/:id')
  @Permissions(PERMISSIONS.LEAD_ADS_READ)
  async getEntry(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const entry = await this.leadAdRepo.findById(id);
    if (!entry || entry.orgId !== orgId) {
      return null;
    }
    return entry;
  }

  @Post('entries/:id/retry')
  @Permissions(PERMISSIONS.LEAD_ADS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async retryEntry(
    @CurrentUser('orgId') orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const entry = await this.leadAdRepo.findById(id);
    if (!entry || entry.orgId !== orgId) {
      return { success: false, error: 'Entry not found' };
    }

    if (entry.status !== 'FAILED') {
      return { success: false, error: 'Only failed entries can be retried' };
    }

    // Reset status and reprocess
    await this.leadAdRepo.update(id, { status: 'PENDING', errorMessage: null });
    await this.processUseCase.execute(id);

    return { success: true };
  }

  @Get('analytics')
  @Permissions(PERMISSIONS.LEAD_ADS_READ)
  async getAnalytics(
    @CurrentUser('orgId') orgId: string,
    @Query() query: LeadAdAnalyticsQueryDto,
  ) {
    return this.analyticsUseCase.execute(
      orgId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined,
      query.platform,
    );
  }

  @Get('config')
  @Permissions(PERMISSIONS.LEAD_ADS_READ)
  async getConfig(@CurrentUser('orgId') orgId: string) {
    const channels = await this.leadAdRepo.findChannelsByOrg(orgId);
    const leadAdsConfig = await this.leadAdsConfigRepo.findByOrgId(orgId);
    const apiBaseUrl = this.configService.get<string>('API_BASE_URL', '');

    return {
      configured: channels.length > 0,
      subscribedPages: channels.map((ch) => ({
        pageId: ch.externalId,
        pageName: ch.externalHandle || ch.name,
        channelId: ch.id,
        channelType: ch.type,
      })),
      webhookUrl: `${apiBaseUrl}/webhooks/meta/leadgen/${orgId}`,
      hasAppSecret: !!leadAdsConfig?.encryptedAppSecret,
      hasVerifyToken: !!leadAdsConfig?.webhookVerifyToken,
      isFullyConfigured: leadAdsConfig?.isConfigured ?? false,
    };
  }

  @Put('config')
  @Permissions(PERMISSIONS.LEAD_ADS_MANAGE)
  async saveConfig(
    @CurrentUser('orgId') orgId: string,
    @Body() dto: SaveLeadAdsConfigDto,
  ) {
    await this.leadAdsConfigRepo.upsert(orgId, {
      appSecret: dto.metaAppSecret,
      webhookVerifyToken: dto.webhookVerifyToken,
    });
    return { success: true };
  }
}
