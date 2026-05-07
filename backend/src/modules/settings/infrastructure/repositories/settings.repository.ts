import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import {
  Setting,
  FeatureFlag,
  IntegrationConfig,
  Webhook,
  WebhookDelivery,
  SettingScope,
  IntegrationProvider,
  IntegrationStatus,
  WebhookDeliveryStatus,
  Prisma,
} from '@prisma/client';

// ─── Setting Inputs ───

export interface CreateSettingInput {
  orgId?: string | null;
  scope: SettingScope;
  category: string;
  key: string;
  value: Prisma.InputJsonValue;
  valueType: string;
  description?: string;
  isSecret?: boolean;
}

export interface UpdateSettingInput {
  value?: Prisma.InputJsonValue;
  valueType?: string;
  description?: string;
  isSecret?: boolean;
}

// ─── Feature Flag Inputs ───

export interface CreateFeatureFlagInput {
  orgId?: string | null;
  scope: SettingScope;
  featureKey: string;
  enabled: boolean;
  metadata?: Prisma.InputJsonValue;
  description?: string;
  expiresAt?: Date;
}

export interface UpdateFeatureFlagInput {
  enabled?: boolean;
  metadata?: Prisma.InputJsonValue;
  description?: string;
  expiresAt?: Date | null;
}

// ─── Integration Config Inputs ───

export interface CreateIntegrationConfigInput {
  orgId: string;
  provider: IntegrationProvider;
  displayName: string;
  credentials: string;
  configuration?: Prisma.InputJsonValue;
  status?: IntegrationStatus;
}

export interface UpdateIntegrationConfigInput {
  displayName?: string;
  credentials?: string;
  configuration?: Prisma.InputJsonValue;
  status?: IntegrationStatus;
  lastTestedAt?: Date;
  lastError?: string | null;
}

// ─── Webhook Inputs ───

export interface CreateWebhookInput {
  orgId: string;
  url: string;
  secret: string;
  description?: string;
  events: Prisma.InputJsonValue;
  headers?: Prisma.InputJsonValue;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface UpdateWebhookInput {
  url?: string;
  description?: string;
  events?: Prisma.InputJsonValue;
  headers?: Prisma.InputJsonValue;
  enabled?: boolean;
  maxRetries?: number;
  timeoutMs?: number;
}

export interface CreateWebhookDeliveryInput {
  webhookId: string;
  orgId: string;
  eventType: string;
  payload: Prisma.InputJsonValue;
  maxRetries: number;
  idempotencyKey?: string;
}

// ─── List Params ───

export interface ListSettingsParams {
  orgId?: string;
  scope?: SettingScope;
  category?: string;
}

export interface ListWebhookDeliveriesParams {
  webhookId: string;
  orgId: string;
  status?: WebhookDeliveryStatus;
  eventType?: string;
  limit: number;
  offset: number;
}

@Injectable()
export class SettingsRepository {
  private readonly logger = new Logger(SettingsRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  // ═══════════════════════════════════════════════
  // SETTINGS
  // ═══════════════════════════════════════════════

  async createSetting(input: CreateSettingInput): Promise<Setting> {
    return this.prisma.setting.create({ data: input });
  }

  async findSettingById(id: string, orgId?: string): Promise<Setting | null> {
    return this.prisma.setting.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(orgId ? { OR: [{ orgId }, { orgId: null }] } : {}),
      },
    });
  }

  async findByKey(
    category: string,
    key: string,
    orgId?: string,
  ): Promise<Setting[]> {
    return this.prisma.setting.findMany({
      where: {
        category,
        key,
        deletedAt: null,
        OR: orgId
          ? [{ orgId }, { orgId: null }]
          : [{ orgId: null }],
      },
      orderBy: { scope: 'asc' }, // SYSTEM < PLAN < ORG
    });
  }

  async findByCategory(category: string, orgId?: string): Promise<Setting[]> {
    return this.prisma.setting.findMany({
      where: {
        category,
        deletedAt: null,
        OR: orgId
          ? [{ orgId }, { orgId: null }]
          : [{ orgId: null }],
      },
      orderBy: [{ key: 'asc' }, { scope: 'asc' }],
    });
  }

  async listSettings(params: ListSettingsParams): Promise<Setting[]> {
    const where: Prisma.SettingWhereInput = { deletedAt: null };
    if (params.orgId) {
      where.OR = [{ orgId: params.orgId }, { orgId: null }];
    }
    if (params.scope) where.scope = params.scope;
    if (params.category) where.category = params.category;

    return this.prisma.setting.findMany({
      where,
      orderBy: [{ category: 'asc' }, { key: 'asc' }, { scope: 'asc' }],
    });
  }

  async updateSetting(
    id: string,
    input: UpdateSettingInput,
    expectedVersion: number,
  ): Promise<Setting> {
    // Optimistic concurrency control
    const updated = await this.prisma.setting.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: { ...input, version: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new Error('CONCURRENT_MODIFICATION');
    }

    return this.prisma.setting.findUniqueOrThrow({ where: { id } });
  }

  async softDeleteSetting(id: string): Promise<Setting> {
    return this.prisma.setting.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countSettingsByOrg(orgId: string): Promise<number> {
    return this.prisma.setting.count({
      where: { orgId, deletedAt: null },
    });
  }

  // ═══════════════════════════════════════════════
  // FEATURE FLAGS
  // ═══════════════════════════════════════════════

  async createFeatureFlag(input: CreateFeatureFlagInput): Promise<FeatureFlag> {
    return this.prisma.featureFlag.create({ data: input });
  }

  async findFeatureFlagById(id: string, orgId?: string): Promise<FeatureFlag | null> {
    return this.prisma.featureFlag.findFirst({
      where: {
        id,
        deletedAt: null,
        ...(orgId ? { OR: [{ orgId }, { orgId: null }] } : {}),
      },
    });
  }

  async findFeatureFlagByKey(
    featureKey: string,
    orgId?: string,
  ): Promise<FeatureFlag[]> {
    return this.prisma.featureFlag.findMany({
      where: {
        featureKey,
        deletedAt: null,
        OR: orgId
          ? [{ orgId }, { orgId: null }]
          : [{ orgId: null }],
      },
      orderBy: { scope: 'asc' },
    });
  }

  async listFeatureFlags(orgId?: string, scope?: SettingScope): Promise<FeatureFlag[]> {
    const where: Prisma.FeatureFlagWhereInput = { deletedAt: null };
    if (orgId) {
      where.OR = [{ orgId }, { orgId: null }];
    }
    if (scope) where.scope = scope;

    return this.prisma.featureFlag.findMany({
      where,
      orderBy: [{ featureKey: 'asc' }, { scope: 'asc' }],
    });
  }

  async updateFeatureFlag(
    id: string,
    input: UpdateFeatureFlagInput,
    expectedVersion: number,
  ): Promise<FeatureFlag> {
    const updated = await this.prisma.featureFlag.updateMany({
      where: { id, version: expectedVersion, deletedAt: null },
      data: { ...input, version: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new Error('CONCURRENT_MODIFICATION');
    }

    return this.prisma.featureFlag.findUniqueOrThrow({ where: { id } });
  }

  async softDeleteFeatureFlag(id: string): Promise<FeatureFlag> {
    return this.prisma.featureFlag.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countFeatureFlagsByOrg(orgId: string): Promise<number> {
    return this.prisma.featureFlag.count({
      where: { orgId, deletedAt: null },
    });
  }

  // ═══════════════════════════════════════════════
  // INTEGRATION CONFIGS
  // ═══════════════════════════════════════════════

  async createIntegrationConfig(input: CreateIntegrationConfigInput): Promise<IntegrationConfig> {
    return this.prisma.integrationConfig.create({ data: input });
  }

  async findIntegrationConfigById(id: string, orgId: string): Promise<IntegrationConfig | null> {
    return this.prisma.integrationConfig.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async findIntegrationByProvider(
    orgId: string,
    provider: IntegrationProvider,
  ): Promise<IntegrationConfig | null> {
    return this.prisma.integrationConfig.findFirst({
      where: { orgId, provider, deletedAt: null },
    });
  }

  async listIntegrationConfigs(orgId: string): Promise<IntegrationConfig[]> {
    return this.prisma.integrationConfig.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { provider: 'asc' },
    });
  }

  async updateIntegrationConfig(
    id: string,
    orgId: string,
    input: UpdateIntegrationConfigInput,
    expectedVersion: number,
  ): Promise<IntegrationConfig> {
    const updated = await this.prisma.integrationConfig.updateMany({
      where: { id, orgId, version: expectedVersion, deletedAt: null },
      data: { ...input, version: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new Error('CONCURRENT_MODIFICATION');
    }

    return this.prisma.integrationConfig.findUniqueOrThrow({ where: { id } });
  }

  async softDeleteIntegrationConfig(id: string, orgId: string): Promise<IntegrationConfig> {
    return this.prisma.integrationConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countIntegrationsByOrg(orgId: string): Promise<number> {
    return this.prisma.integrationConfig.count({
      where: { orgId, deletedAt: null },
    });
  }

  // ═══════════════════════════════════════════════
  // WEBHOOKS
  // ═══════════════════════════════════════════════

  async createWebhook(input: CreateWebhookInput): Promise<Webhook> {
    return this.prisma.webhook.create({ data: input });
  }

  async findWebhookById(id: string, orgId: string): Promise<Webhook | null> {
    return this.prisma.webhook.findFirst({
      where: { id, orgId, deletedAt: null },
    });
  }

  async listWebhooks(orgId: string): Promise<Webhook[]> {
    return this.prisma.webhook.findMany({
      where: { orgId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findWebhooksByEvent(orgId: string, eventType: string): Promise<Webhook[]> {
    // Find enabled, non-deleted webhooks that subscribe to this event
    const webhooks = await this.prisma.webhook.findMany({
      where: {
        orgId,
        enabled: true,
        deletedAt: null,
        disabledAt: null,
      },
    });

    // Filter by event type in JSON array
    return webhooks.filter((wh) => {
      const events = wh.events as string[];
      return Array.isArray(events) && events.includes(eventType);
    });
  }

  async updateWebhook(
    id: string,
    orgId: string,
    input: UpdateWebhookInput,
    expectedVersion: number,
  ): Promise<Webhook> {
    const updated = await this.prisma.webhook.updateMany({
      where: { id, orgId, version: expectedVersion, deletedAt: null },
      data: { ...input, version: { increment: 1 } },
    });

    if (updated.count === 0) {
      throw new Error('CONCURRENT_MODIFICATION');
    }

    return this.prisma.webhook.findUniqueOrThrow({ where: { id } });
  }

  async incrementWebhookFailureCount(id: string): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id },
      data: { failureCount: { increment: 1 } },
    });
  }

  async resetWebhookFailureCount(id: string): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id },
      data: { failureCount: 0, lastDeliveryAt: new Date() },
    });
  }

  async autoDisableWebhook(id: string): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id },
      data: { enabled: false, disabledAt: new Date() },
    });
  }

  async softDeleteWebhook(id: string, orgId: string): Promise<Webhook> {
    return this.prisma.webhook.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async countWebhooksByOrg(orgId: string): Promise<number> {
    return this.prisma.webhook.count({
      where: { orgId, deletedAt: null },
    });
  }

  // ═══════════════════════════════════════════════
  // WEBHOOK DELIVERIES
  // ═══════════════════════════════════════════════

  async createWebhookDelivery(input: CreateWebhookDeliveryInput): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.create({ data: input });
  }

  async findWebhookDeliveryById(id: string): Promise<WebhookDelivery | null> {
    return this.prisma.webhookDelivery.findUnique({ where: { id } });
  }

  async findDeliveryByIdempotencyKey(key: string): Promise<WebhookDelivery | null> {
    return this.prisma.webhookDelivery.findUnique({
      where: { idempotencyKey: key },
    });
  }

  async listWebhookDeliveries(
    params: ListWebhookDeliveriesParams,
  ): Promise<{ deliveries: WebhookDelivery[]; total: number }> {
    const where: Prisma.WebhookDeliveryWhereInput = {
      webhookId: params.webhookId,
      orgId: params.orgId,
    };
    if (params.status) where.status = params.status;
    if (params.eventType) where.eventType = params.eventType;

    const [deliveries, total] = await this.prisma.$transaction([
      this.prisma.webhookDelivery.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: params.limit,
        skip: params.offset,
      }),
      this.prisma.webhookDelivery.count({ where }),
    ]);

    return { deliveries, total };
  }

  async updateWebhookDelivery(
    id: string,
    data: Prisma.WebhookDeliveryUpdateInput,
  ): Promise<WebhookDelivery> {
    return this.prisma.webhookDelivery.update({ where: { id }, data });
  }

  async findPendingRetries(): Promise<WebhookDelivery[]> {
    return this.prisma.webhookDelivery.findMany({
      where: {
        status: WebhookDeliveryStatus.RETRYING,
        nextRetryAt: { lte: new Date() },
      },
      take: 100,
      orderBy: { nextRetryAt: 'asc' },
    });
  }

  async deleteOldDeliveries(retentionDays: number): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const result = await this.prisma.webhookDelivery.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    return result.count;
  }
}
