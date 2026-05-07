import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Permissions } from '@/common/decorators/permissions.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PERMISSIONS } from '@/modules/rbac/domain/permissions.constants';
import { ManageSettingsUseCase } from '../../application/use-cases/manage-settings.use-case';
import { SettingsRepository } from '../../infrastructure/repositories/settings.repository';
import { ManageFeatureFlagsUseCase } from '../../application/use-cases/manage-feature-flags.use-case';
import { ManageIntegrationsUseCase } from '../../application/use-cases/manage-integrations.use-case';
import { ManageWebhooksUseCase } from '../../application/use-cases/manage-webhooks.use-case';
import {
  CreateSettingDto,
  UpdateSettingDto,
  ListSettingsQueryDto,
  ResolveSettingQueryDto,
} from '../../application/dto/setting.dto';
import {
  CreateFeatureFlagDto,
  UpdateFeatureFlagDto,
  ListFeatureFlagsQueryDto,
  ResolveFeatureFlagQueryDto,
} from '../../application/dto/feature-flag.dto';
import {
  CreateIntegrationConfigDto,
  UpdateIntegrationConfigDto,
} from '../../application/dto/integration-config.dto';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  ListWebhookDeliveriesQueryDto,
} from '../../application/dto/webhook.dto';

interface JwtPayload {
  userId: string;
  orgId: string;
  role: string;
}

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly manageSettings: ManageSettingsUseCase,
    private readonly manageFeatureFlags: ManageFeatureFlagsUseCase,
    private readonly manageIntegrations: ManageIntegrationsUseCase,
    private readonly manageWebhooks: ManageWebhooksUseCase,
    private readonly settingsRepo: SettingsRepository,
  ) {}

  // ═══════════════════════════════════════════════
  // WHATSAPP CONFIG
  // ═══════════════════════════════════════════════

  private readonly WA_DEFAULTS = {
    messageDelay: 1000,
    retryLimit: 3,
    autoReconnect: true,
    sessionTimeout: 3600,
  };

  private readonly WH_DEFAULTS = {
    enabled: true,
    startHour: '09:00',
    endHour: '18:00',
    workDays: [true, true, true, true, true, false, false],
    autoReplyEnabled: false,
    autoReplyMessage: "Thanks for reaching out! We're currently outside business hours. We'll get back to you as soon as we're open.",
  };

  @Get('whatsapp-config')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getWhatsAppConfig(@CurrentUser() user: JwtPayload) {
    const rows = await this.settingsRepo.findByKey('whatsapp', 'config', user.orgId);
    const org = rows.find((r) => r.orgId === user.orgId) ?? rows[0];
    return org ? (org.value as object) : this.WA_DEFAULTS;
  }

  @Patch('whatsapp-config')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async updateWhatsAppConfig(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const rows = await this.settingsRepo.findByKey('whatsapp', 'config', user.orgId);
    const existing = rows.find((r) => r.orgId === user.orgId);
    const merged = { ...this.WA_DEFAULTS, ...(existing ? (existing.value as object) : {}), ...body };
    if (existing) {
      await this.settingsRepo.updateSetting(existing.id, { value: merged as any }, existing.version);
    } else {
      await this.settingsRepo.createSetting({
        orgId: user.orgId,
        scope: 'ORG' as any,
        category: 'whatsapp',
        key: 'config',
        value: merged as any,
        valueType: 'json',
      });
    }
    return merged;
  }

  // ═══════════════════════════════════════════════
  // WORKING HOURS
  // ═══════════════════════════════════════════════

  @Get('working-hours')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async getWorkingHours(@CurrentUser() user: JwtPayload) {
    const rows = await this.settingsRepo.findByKey('messaging', 'working_hours', user.orgId);
    const org = rows.find((r) => r.orgId === user.orgId) ?? rows[0];
    return org ? (org.value as object) : this.WH_DEFAULTS;
  }

  @Patch('working-hours')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async updateWorkingHours(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, unknown>,
  ) {
    const rows = await this.settingsRepo.findByKey('messaging', 'working_hours', user.orgId);
    const existing = rows.find((r) => r.orgId === user.orgId);
    const merged = { ...this.WH_DEFAULTS, ...(existing ? (existing.value as object) : {}), ...body };
    if (existing) {
      await this.settingsRepo.updateSetting(existing.id, { value: merged as any }, existing.version);
    } else {
      await this.settingsRepo.createSetting({
        orgId: user.orgId,
        scope: 'ORG' as any,
        category: 'messaging',
        key: 'working_hours',
        value: merged as any,
        valueType: 'json',
      });
    }
    return merged;
  }

  // ═══════════════════════════════════════════════
  // SETTINGS (Key-Value Configuration)
  // ═══════════════════════════════════════════════

  @Get('config')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listSettings(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListSettingsQueryDto,
  ) {
    return this.manageSettings.list(user.orgId, query);
  }

  @Get('config/resolve')
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async resolveSetting(
    @CurrentUser() user: JwtPayload,
    @Query() query: ResolveSettingQueryDto,
  ) {
    return this.manageSettings.resolve(user.orgId, query.category, query.key);
  }

  @Post('config')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async createSetting(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSettingDto,
    @Req() req: Request,
  ) {
    return this.manageSettings.create(
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('config/:id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  async updateSetting(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSettingDto,
    @Req() req: Request,
  ) {
    return this.manageSettings.update(
      id,
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('config/:id')
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSetting(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.manageSettings.delete(
      id,
      user.orgId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ═══════════════════════════════════════════════
  // FEATURE FLAGS
  // ═══════════════════════════════════════════════

  private readonly FF_DEFAULTS = {
    campaigns: true,
    automation: true,
    analytics: true,
    scheduler: true,
    billing: true,
  };

  @Get('feature-flags')
  @Permissions(PERMISSIONS.FEATURE_FLAGS_READ)
  async listFeatureFlags(
    @CurrentUser() user: JwtPayload,
    @Query() query: ListFeatureFlagsQueryDto,
  ) {
    // If no query params, return the simple flags object the UI expects
    if (!query.scope) {
      const rows = await this.settingsRepo.findByKey('feature_flags', 'config', user.orgId);
      const org = rows.find((r) => r.orgId === user.orgId) ?? rows[0];
      return org ? (org.value as object) : this.FF_DEFAULTS;
    }
    return this.manageFeatureFlags.list(user.orgId, query);
  }

  @Patch('feature-flags')
  @Permissions(PERMISSIONS.FEATURE_FLAGS_MANAGE)
  @HttpCode(HttpStatus.OK)
  async updateFeatureFlags(
    @CurrentUser() user: JwtPayload,
    @Body() body: Record<string, boolean>,
  ) {
    const rows = await this.settingsRepo.findByKey('feature_flags', 'config', user.orgId);
    const existing = rows.find((r) => r.orgId === user.orgId);
    const merged = { ...this.FF_DEFAULTS, ...(existing ? (existing.value as object) : {}), ...body };
    if (existing) {
      await this.settingsRepo.updateSetting(existing.id, { value: merged as any }, existing.version);
    } else {
      await this.settingsRepo.createSetting({
        orgId: user.orgId,
        scope: 'ORG' as any,
        category: 'feature_flags',
        key: 'config',
        value: merged as any,
        valueType: 'json',
      });
    }
    return merged;
  }

  @Get('feature-flags/resolve/:featureKey')
  @Permissions(PERMISSIONS.FEATURE_FLAGS_READ)
  async resolveFeatureFlag(
    @Param('featureKey') featureKey: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.manageFeatureFlags.resolve(user.orgId, featureKey);
  }

  @Post('feature-flags')
  @Permissions(PERMISSIONS.FEATURE_FLAGS_MANAGE)
  async createFeatureFlag(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateFeatureFlagDto,
    @Req() req: Request,
  ) {
    return this.manageFeatureFlags.create(
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('feature-flags/:id')
  @Permissions(PERMISSIONS.FEATURE_FLAGS_MANAGE)
  async updateFeatureFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateFeatureFlagDto,
    @Req() req: Request,
  ) {
    return this.manageFeatureFlags.update(
      id,
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('feature-flags/:id')
  @Permissions(PERMISSIONS.FEATURE_FLAGS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFeatureFlag(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.manageFeatureFlags.delete(
      id,
      user.orgId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ═══════════════════════════════════════════════
  // INTEGRATION CONFIGS
  // ═══════════════════════════════════════════════

  @Get('integrations')
  @Permissions(PERMISSIONS.INTEGRATIONS_READ)
  async listIntegrations(@CurrentUser() user: JwtPayload) {
    return this.manageIntegrations.list(user.orgId);
  }

  @Get('integrations/:id')
  @Permissions(PERMISSIONS.INTEGRATIONS_READ)
  async getIntegration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.manageIntegrations.getById(id, user.orgId);
  }

  @Post('integrations')
  @Permissions(PERMISSIONS.INTEGRATIONS_MANAGE)
  async createIntegration(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateIntegrationConfigDto,
    @Req() req: Request,
  ) {
    return this.manageIntegrations.create(
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('integrations/:id')
  @Permissions(PERMISSIONS.INTEGRATIONS_MANAGE)
  async updateIntegration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateIntegrationConfigDto,
    @Req() req: Request,
  ) {
    return this.manageIntegrations.update(
      id,
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('integrations/:id')
  @Permissions(PERMISSIONS.INTEGRATIONS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteIntegration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.manageIntegrations.delete(
      id,
      user.orgId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('integrations/:id/test')
  @Permissions(PERMISSIONS.INTEGRATIONS_MANAGE)
  async testIntegration(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.manageIntegrations.test(
      id,
      user.orgId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  // ═══════════════════════════════════════════════
  // WEBHOOKS
  // ═══════════════════════════════════════════════

  @Get('webhooks')
  @Permissions(PERMISSIONS.WEBHOOKS_READ)
  async listWebhooks(@CurrentUser() user: JwtPayload) {
    return this.manageWebhooks.list(user.orgId);
  }

  @Get('webhooks/:id')
  @Permissions(PERMISSIONS.WEBHOOKS_READ)
  async getWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.manageWebhooks.getById(id, user.orgId);
  }

  @Get('webhooks/:id/deliveries')
  @Permissions(PERMISSIONS.WEBHOOKS_READ)
  async listWebhookDeliveries(
    @Param('id', ParseUUIDPipe) webhookId: string,
    @CurrentUser() user: JwtPayload,
    @Query() query: ListWebhookDeliveriesQueryDto,
  ) {
    return this.manageWebhooks.listDeliveries(webhookId, user.orgId, query);
  }

  @Post('webhooks')
  @Permissions(PERMISSIONS.WEBHOOKS_MANAGE)
  async createWebhook(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateWebhookDto,
    @Req() req: Request,
  ) {
    return this.manageWebhooks.create(
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Patch('webhooks/:id')
  @Permissions(PERMISSIONS.WEBHOOKS_MANAGE)
  async updateWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateWebhookDto,
    @Req() req: Request,
  ) {
    return this.manageWebhooks.update(
      id,
      user.orgId,
      user.userId,
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Delete('webhooks/:id')
  @Permissions(PERMISSIONS.WEBHOOKS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    await this.manageWebhooks.delete(
      id,
      user.orgId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('webhooks/:id/test')
  @Permissions(PERMISSIONS.WEBHOOKS_MANAGE)
  async testWebhook(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ) {
    return this.manageWebhooks.test(
      id,
      user.orgId,
      user.userId,
      req.ip,
      req.headers['user-agent'],
    );
  }
}
