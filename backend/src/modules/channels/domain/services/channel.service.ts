import {
  Injectable,
  Logger,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ChannelType, ChannelStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ChannelRepository, ChannelFilters } from '../../infrastructure/repositories/channel.repository';
import { ChannelAdapterRegistry } from './channel-adapter-registry';
import { EncryptionService } from './channel-encryption.service';
import { EVENT_NAMES, CHANNEL_CONFIG } from '@/common/constants';

@Injectable()
export class ChannelService {
  private readonly logger = new Logger(ChannelService.name);

  constructor(
    private readonly channelRepo: ChannelRepository,
    private readonly adapterRegistry: ChannelAdapterRegistry,
    private readonly encryptionService: EncryptionService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createChannel(
    orgId: string,
    userId: string,
    type: ChannelType,
    name: string,
    config: Record<string, unknown>,
    rateLimitPerMin?: number,
  ) {
    // 1. Check org channel limit
    const existingCount = await this.channelRepo.countByOrg(orgId);
    if (existingCount >= CHANNEL_CONFIG.MAX_CHANNELS_PER_ORG) {
      throw new BadRequestException(
        `Maximum channel limit (${CHANNEL_CONFIG.MAX_CHANNELS_PER_ORG}) reached for this organization`,
      );
    }

    // 2. Validate credentials with provider
    const adapter = this.adapterRegistry.getAdapter(type);
    const validation = await adapter.validateCredentials(config);

    if (!validation.valid) {
      throw new BadRequestException(
        `Channel verification failed: ${validation.error}`,
      );
    }

    // 3. Check for duplicate handle
    const existing = await this.channelRepo.findByOrgAndHandle(
      orgId,
      type,
      validation.externalHandle,
    );
    if (existing) {
      throw new ConflictException(
        `A ${type} channel with handle ${validation.externalHandle} already exists`,
      );
    }

    // 4. Encrypt config
    const encryptedConfig = this.encryptionService.encrypt(
      JSON.stringify(config),
    );

    // 5. Create channel
    const rateLimit =
      rateLimitPerMin || CHANNEL_CONFIG.DEFAULT_RATE_LIMIT_PER_MIN;
    const channel = await this.channelRepo.create({
      organization: { connect: { id: orgId } },
      type,
      name,
      status: ChannelStatus.ACTIVE,
      externalId: validation.externalId,
      externalHandle: validation.externalHandle,
      encryptedConfig,
      capabilities: validation.capabilities as any,
      rateLimitPerMin: rateLimit,
      rateLimitBurst: rateLimit * 2,
      createdById: userId,
      verifiedAt: new Date(),
    });

    // 6. Register webhook (non-blocking — channel is usable for outbound even if this fails)
    this.registerWebhookAsync(channel.id, type, config);

    // 7. Emit event
    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_CREATED, {
      orgId,
      channelId: channel.id,
      channelType: type,
      userId,
    });

    this.logger.log(
      `Channel created: ${channel.id} (${type}) for org ${orgId}`,
    );

    return channel;
  }

  async getChannel(orgId: string, channelId: string) {
    const channel = await this.channelRepo.findByIdAndOrg(
      channelId,
      orgId,
    );
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return channel;
  }

  async getDecryptedConfig(
    channelId: string,
  ): Promise<Record<string, unknown>> {
    const channel = await this.channelRepo.findById(channelId);
    if (!channel?.encryptedConfig) {
      throw new BadRequestException('Channel has no configuration');
    }
    return JSON.parse(
      this.encryptionService.decrypt(channel.encryptedConfig),
    );
  }

  async updateChannel(
    orgId: string,
    channelId: string,
    updates: {
      name?: string;
      rateLimitPerMin?: number;
      config?: Record<string, unknown>;
    },
  ) {
    const channel = await this.getChannel(orgId, channelId);

    const data: Record<string, unknown> = {};

    if (updates.name) {
      data.name = updates.name;
    }
    if (updates.rateLimitPerMin) {
      data.rateLimitPerMin = updates.rateLimitPerMin;
      data.rateLimitBurst = updates.rateLimitPerMin * 2;
    }

    // Config update triggers re-verification
    if (updates.config) {
      const adapter = this.adapterRegistry.getAdapter(channel.type);
      const validation = await adapter.validateCredentials(
        updates.config,
      );

      if (!validation.valid) {
        throw new BadRequestException(
          `Credential verification failed: ${validation.error}`,
        );
      }

      data.encryptedConfig = this.encryptionService.encrypt(
        JSON.stringify(updates.config),
      );
      data.externalId = validation.externalId;
      data.externalHandle = validation.externalHandle;
      data.capabilities = validation.capabilities as any;
      data.verifiedAt = new Date();
      data.lastError = null;
      data.lastErrorAt = null;
    }

    const updated = await this.channelRepo.update(channelId, data);

    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_UPDATED, {
      orgId,
      channelId,
      channelType: channel.type,
      changes: Object.keys(updates),
    });

    return updated;
  }

  async suspendChannel(
    orgId: string,
    channelId: string,
    reason: string,
  ): Promise<void> {
    const channel = await this.getChannel(orgId, channelId);

    if (channel.status === ChannelStatus.SUSPENDED) {
      throw new ConflictException('Channel is already suspended');
    }

    await this.channelRepo.update(channelId, {
      status: ChannelStatus.SUSPENDED,
      suspendedAt: new Date(),
      suspendReason: reason,
    });

    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_SUSPENDED, {
      orgId,
      channelId,
      channelType: channel.type,
      reason,
    });

    this.logger.log(
      `Channel suspended: ${channelId} — ${reason}`,
    );
  }

  async reactivateChannel(
    orgId: string,
    channelId: string,
  ): Promise<void> {
    const channel = await this.channelRepo.findByIdAndOrg(
      channelId,
      orgId,
    );
    if (!channel || channel.status !== ChannelStatus.SUSPENDED) {
      throw new NotFoundException('Suspended channel not found');
    }

    // Re-validate credentials before reactivation
    const config = await this.getDecryptedConfig(channelId);
    const adapter = this.adapterRegistry.getAdapter(channel.type);
    const validation = await adapter.validateCredentials(config);

    if (!validation.valid) {
      throw new BadRequestException(
        `Cannot reactivate: credentials invalid — ${validation.error}`,
      );
    }

    await this.channelRepo.update(channelId, {
      status: ChannelStatus.ACTIVE,
      suspendedAt: null,
      suspendReason: null,
      verifiedAt: new Date(),
      lastError: null,
      lastErrorAt: null,
    });

    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_REACTIVATED, {
      orgId,
      channelId,
      channelType: channel.type,
    });

    this.logger.log(`Channel reactivated: ${channelId}`);
  }

  async deleteChannel(
    orgId: string,
    channelId: string,
  ): Promise<void> {
    const channel = await this.getChannel(orgId, channelId);

    // Check for active conversations
    const activeConversations =
      await this.channelRepo.countActiveConversations(channelId);

    if (activeConversations > 0) {
      throw new ConflictException(
        `Cannot delete channel with ${activeConversations} active conversations. Close or reassign them first.`,
      );
    }

    await this.channelRepo.softDelete(channelId);

    this.eventEmitter.emit(EVENT_NAMES.CHANNEL_DELETED, {
      orgId,
      channelId,
      channelType: channel.type,
    });

    this.logger.log(`Channel deleted: ${channelId}`);
  }

  async listChannels(orgId: string, filters?: ChannelFilters) {
    return this.channelRepo.listByOrg(orgId, filters);
  }

  async checkRateLimit(
    channelId: string,
    orgId: string,
    limitPerMin: number,
  ): Promise<void> {
    const windowStart = new Date();
    windowStart.setSeconds(0, 0);

    const count = await this.channelRepo.upsertRateLimit(
      channelId,
      orgId,
      windowStart,
    );

    if (count > limitPerMin) {
      throw new BadRequestException(
        `Rate limit exceeded for this channel (${limitPerMin}/min)`,
      );
    }
  }

  async recordChannelError(
    channelId: string,
    error: string,
  ): Promise<void> {
    await this.channelRepo.update(channelId, {
      lastErrorAt: new Date(),
      lastError: error,
    });
  }

  async updateLastActive(channelId: string): Promise<void> {
    await this.channelRepo.update(channelId, {
      lastActiveAt: new Date(),
    });
  }

  private async registerWebhookAsync(
    channelId: string,
    type: ChannelType,
    config: Record<string, unknown>,
  ): Promise<void> {
    try {
      const adapter = this.adapterRegistry.getAdapter(type);
      const callbackUrl = `${process.env.API_BASE_URL}/webhooks/channels/${channelId}`;
      const webhook = await adapter.registerWebhook(
        config,
        callbackUrl,
      );

      await this.channelRepo.update(channelId, {
        webhookId: webhook.webhookId,
        webhookSecret: webhook.webhookSecret,
      });

      this.logger.log(
        `Webhook registered for channel ${channelId}: ${webhook.webhookId}`,
      );
    } catch (error: any) {
      this.logger.warn(
        `Webhook registration failed for channel ${channelId}: ${error.message}`,
      );
    }
  }
}
