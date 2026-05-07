import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  SetMetadata,
} from '@nestjs/common';
import { Request } from 'express';
import { Roles } from '@/common/decorators/roles.decorator';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser, JwtPayload } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { FeatureFlagGuard, FEATURE_FLAG_KEY } from '@/modules/billing/interfaces/guards/feature-flag.guard';
import { UsageLimitGuard, USAGE_LIMIT_KEY } from '@/modules/billing/interfaces/guards/usage-limit.guard';
import { UsageMetricType } from '@prisma/client';
import { CreateCampaignDto, AudienceFiltersDto } from '../../application/dto/create-campaign.dto';
import { UpdateCampaignDto } from '../../application/dto/update-campaign.dto';
import {
  ListCampaignsQueryDto,
  ListRecipientsQueryDto,
} from '../../application/dto/list-campaigns-query.dto';
import { CreateCampaignUseCase } from '../../application/use-cases/create-campaign.use-case';
import { UpdateCampaignUseCase } from '../../application/use-cases/update-campaign.use-case';
import { ExecuteCampaignUseCase } from '../../application/use-cases/execute-campaign.use-case';
import { ScheduleCampaignUseCase } from '../../application/use-cases/schedule-campaign.use-case';
import { PauseCampaignUseCase } from '../../application/use-cases/pause-campaign.use-case';
import { ResumeCampaignUseCase } from '../../application/use-cases/resume-campaign.use-case';
import { CancelCampaignUseCase } from '../../application/use-cases/cancel-campaign.use-case';
import { GetCampaignUseCase } from '../../application/use-cases/get-campaign.use-case';
import { ListCampaignsUseCase } from '../../application/use-cases/list-campaigns.use-case';
import { GetCampaignAnalyticsUseCase } from '../../application/use-cases/get-campaign-analytics.use-case';
import { PreviewAudienceUseCase } from '../../application/use-cases/preview-audience.use-case';
import { CampaignRecipientRepository } from '../../infrastructure/repositories/campaign-recipient.repository';
import { GenerateCampaignCopyUseCase, GenerateCampaignCopyDto } from '../../application/use-cases/generate-campaign-copy.use-case';

@Controller('campaigns')
export class CampaignController {
  constructor(
    private readonly createCampaignUseCase: CreateCampaignUseCase,
    private readonly updateCampaignUseCase: UpdateCampaignUseCase,
    private readonly executeCampaignUseCase: ExecuteCampaignUseCase,
    private readonly scheduleCampaignUseCase: ScheduleCampaignUseCase,
    private readonly pauseCampaignUseCase: PauseCampaignUseCase,
    private readonly resumeCampaignUseCase: ResumeCampaignUseCase,
    private readonly cancelCampaignUseCase: CancelCampaignUseCase,
    private readonly getCampaignUseCase: GetCampaignUseCase,
    private readonly listCampaignsUseCase: ListCampaignsUseCase,
    private readonly getCampaignAnalyticsUseCase: GetCampaignAnalyticsUseCase,
    private readonly previewAudienceUseCase: PreviewAudienceUseCase,
    private readonly recipientRepo: CampaignRecipientRepository,
    private readonly generateCampaignCopyUseCase: GenerateCampaignCopyUseCase,
  ) {}

  @Post()
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  @UseGuards(FeatureFlagGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
  @HttpCode(HttpStatus.CREATED)
  async createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.createCampaignUseCase.execute(
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get()
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async listCampaigns(
    @Query() query: ListCampaignsQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.listCampaignsUseCase.execute(user.orgId, query);
  }

  @Get(':id')
  @Roles('ADMIN', 'MANAGER', 'EMPLOYEE')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async getCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getCampaignUseCase.execute(id, user.orgId);
  }

  @Patch(':id')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_UPDATE)
  async updateCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.updateCampaignUseCase.execute(
      id,
      user.orgId,
      user.sub,
      dto,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post(':id/execute')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  @UseGuards(FeatureFlagGuard, UsageLimitGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.CAMPAIGN_EXECUTIONS)
  @HttpCode(HttpStatus.OK)
  async executeCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.executeCampaignUseCase.execute(
      id,
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post(':id/schedule')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  @UseGuards(FeatureFlagGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
  @HttpCode(HttpStatus.OK)
  async scheduleCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { scheduledAt: string; timezone?: string },
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.scheduleCampaignUseCase.execute(
      id,
      user.orgId,
      user.sub,
      body.scheduledAt,
      body.timezone || 'UTC',
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post(':id/pause')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  @HttpCode(HttpStatus.OK)
  async pauseCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.pauseCampaignUseCase.execute(
      id,
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post(':id/resume')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_EXECUTE)
  @HttpCode(HttpStatus.OK)
  async resumeCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.resumeCampaignUseCase.execute(
      id,
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Post(':id/cancel')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_CANCEL)
  @HttpCode(HttpStatus.OK)
  async cancelCampaign(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.cancelCampaignUseCase.execute(
      id,
      user.orgId,
      user.sub,
      this.extractIp(req),
      this.extractUserAgent(req),
    );
  }

  @Get(':id/recipients')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async listRecipients(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: ListRecipientsQueryDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 50;

    const { recipients, total } = await this.recipientRepo.findByCampaignPaginated(
      id,
      {
        take: limit,
        skip: (page - 1) * limit,
        status: query.status,
      },
    );

    return {
      data: recipients,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  @Get(':id/analytics')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  async getAnalytics(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.getCampaignAnalyticsUseCase.execute(id, user.orgId);
  }

  @Post('generate-copy')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_CREATE)
  @UseGuards(FeatureFlagGuard, UsageLimitGuard)
  @SetMetadata(FEATURE_FLAG_KEY, 'campaigns')
  @SetMetadata(USAGE_LIMIT_KEY, UsageMetricType.AI_CREDITS)
  @HttpCode(HttpStatus.OK)
  async generateCopy(
    @Body() dto: GenerateCampaignCopyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.generateCampaignCopyUseCase.execute(user.orgId, dto);
  }

  @Post('preview-audience')
  @Roles('ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.CAMPAIGNS_READ)
  @HttpCode(HttpStatus.OK)
  async previewAudience(
    @Body() body: { audienceType: string; audienceFilters?: AudienceFiltersDto },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.previewAudienceUseCase.execute(
      user.orgId,
      body.audienceType as any,
      body.audienceFilters,
    );
  }

  private extractIp(req: Request): string {
    return req.ip || req.socket.remoteAddress || 'unknown';
  }

  private extractUserAgent(req: Request): string {
    return (req.headers['user-agent'] as string) || 'unknown';
  }
}
