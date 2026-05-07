import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SettingsRepository } from '../../infrastructure/repositories/settings.repository';
import { WebhookSigningService } from '../../domain/services/webhook-signing.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import {
  CreateWebhookDto,
  UpdateWebhookDto,
  ListWebhookDeliveriesQueryDto,
} from '../dto/webhook.dto';
import { EVENT_NAMES, QUEUE_NAMES, SETTINGS_CONFIG } from '@/common/constants';

@Injectable()
export class ManageWebhooksUseCase {
  private readonly logger = new Logger(ManageWebhooksUseCase.name);

  constructor(
    private readonly settingsRepository: SettingsRepository,
    private readonly webhookSigningService: WebhookSigningService,
    private readonly auditService: AuditService,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    orgId: string,
    userId: string,
    dto: CreateWebhookDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const count = await this.settingsRepository.countWebhooksByOrg(orgId);
    if (count >= SETTINGS_CONFIG.MAX_WEBHOOKS_PER_ORG) {
      throw new BadRequestException(
        `Maximum webhooks limit (${SETTINGS_CONFIG.MAX_WEBHOOKS_PER_ORG}) reached`,
      );
    }

    this.validateEvents(dto.events);

    const secret = this.webhookSigningService.generateSecret();

    const webhook = await this.settingsRepository.createWebhook({
      orgId,
      url: dto.url,
      secret,
      description: dto.description,
      events: dto.events as any,
      headers: dto.headers as any,
      maxRetries: dto.maxRetries,
      timeoutMs: dto.timeoutMs,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: 'WEBHOOK_CREATED',
      targetType: 'Webhook',
      targetId: webhook.id,
      metadata: { url: dto.url, events: dto.events },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.WEBHOOK_CREATED, {
      webhookId: webhook.id,
      orgId,
      url: dto.url,
      events: dto.events,
      userId,
    });

    return webhook;
  }

  async update(
    id: string,
    orgId: string,
    userId: string,
    dto: UpdateWebhookDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findWebhookById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Webhook not found');
    }

    if (dto.events) {
      this.validateEvents(dto.events);
    }

    const changes: Record<string, unknown> = {};
    const updateData: Record<string, unknown> = {};

    if (dto.url !== undefined && dto.url !== existing.url) {
      updateData.url = dto.url;
      changes.url = { from: existing.url, to: dto.url };
    }
    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }
    if (dto.events !== undefined) {
      updateData.events = dto.events;
      changes.events = { from: existing.events, to: dto.events };
    }
    if (dto.headers !== undefined) {
      updateData.headers = dto.headers;
    }
    if (dto.enabled !== undefined && dto.enabled !== existing.enabled) {
      updateData.enabled = dto.enabled;
      changes.enabled = { from: existing.enabled, to: dto.enabled };
      // Re-enabling clears auto-disable state
      if (dto.enabled) {
        updateData.disabledAt = null;
        updateData.failureCount = 0;
      }
    }
    if (dto.maxRetries !== undefined) updateData.maxRetries = dto.maxRetries;
    if (dto.timeoutMs !== undefined) updateData.timeoutMs = dto.timeoutMs;

    if (Object.keys(updateData).length === 0) {
      return existing;
    }

    try {
      const updated = await this.settingsRepository.updateWebhook(
        id,
        orgId,
        updateData as any,
        dto.version,
      );

      await this.auditService.log({
        orgId,
        userId,
        action: 'WEBHOOK_UPDATED',
        targetType: 'Webhook',
        targetId: id,
        metadata: { changes },
        ipAddress,
        userAgent,
      });

      this.eventEmitter.emit(EVENT_NAMES.WEBHOOK_UPDATED, {
        webhookId: id,
        orgId,
        userId,
        changes,
      });

      return updated;
    } catch (error) {
      if (error instanceof Error && error.message === 'CONCURRENT_MODIFICATION') {
        throw new ConflictException(
          'Webhook was modified by another request. Please refresh and try again.',
        );
      }
      throw error;
    }
  }

  async delete(
    id: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.settingsRepository.findWebhookById(id, orgId);
    if (!existing) {
      throw new NotFoundException('Webhook not found');
    }

    await this.settingsRepository.softDeleteWebhook(id, orgId);

    await this.auditService.log({
      orgId,
      userId,
      action: 'WEBHOOK_DELETED',
      targetType: 'Webhook',
      targetId: id,
      metadata: { url: existing.url },
      ipAddress,
      userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.WEBHOOK_DELETED, {
      webhookId: id,
      orgId,
      userId,
    });
  }

  async list(orgId: string) {
    return this.settingsRepository.listWebhooks(orgId);
  }

  async getById(id: string, orgId: string) {
    const webhook = await this.settingsRepository.findWebhookById(id, orgId);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }
    return webhook;
  }

  async listDeliveries(
    webhookId: string,
    orgId: string,
    query: ListWebhookDeliveriesQueryDto,
  ) {
    // Verify webhook belongs to org
    const webhook = await this.settingsRepository.findWebhookById(webhookId, orgId);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    return this.settingsRepository.listWebhookDeliveries({
      webhookId,
      orgId,
      status: query.status,
      eventType: query.eventType,
      limit: query.limit ?? SETTINGS_CONFIG.WEBHOOK_DELIVERY_PAGE_SIZE,
      offset: query.offset ?? 0,
    });
  }

  /**
   * Send a test delivery to verify webhook endpoint is reachable.
   */
  async test(
    id: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const webhook = await this.settingsRepository.findWebhookById(id, orgId);
    if (!webhook) {
      throw new NotFoundException('Webhook not found');
    }

    // Create a test delivery
    const testPayload = {
      event: 'WEBHOOK_TEST',
      data: { message: 'This is a test webhook delivery', orgId, timestamp: new Date().toISOString() },
    };

    const delivery = await this.settingsRepository.createWebhookDelivery({
      webhookId: id,
      orgId,
      eventType: 'WEBHOOK_TEST',
      payload: testPayload as any,
      maxRetries: 0, // No retries for test
      idempotencyKey: `test:${id}:${Date.now()}`,
    });

    // Queue for immediate delivery
    await this.queueService.publish(QUEUE_NAMES.WEBHOOK_DELIVER, {
      deliveryId: delivery.id,
      webhookId: id,
      orgId,
    });

    await this.auditService.log({
      orgId,
      userId,
      action: 'WEBHOOK_TESTED',
      targetType: 'Webhook',
      targetId: id,
      metadata: { url: webhook.url },
      ipAddress,
      userAgent,
    });

    return { deliveryId: delivery.id, status: 'queued' };
  }

  /**
   * Dispatch webhook deliveries for an event — called by event handlers.
   */
  async dispatch(
    orgId: string,
    eventType: string,
    payload: Record<string, unknown>,
  ): Promise<void> {
    const webhooks = await this.settingsRepository.findWebhooksByEvent(orgId, eventType);

    if (webhooks.length === 0) return;

    for (const webhook of webhooks) {
      const idempotencyKey = `${webhook.id}:${eventType}:${Date.now()}`;

      const delivery = await this.settingsRepository.createWebhookDelivery({
        webhookId: webhook.id,
        orgId,
        eventType,
        payload: { event: eventType, data: payload, timestamp: new Date().toISOString() } as any,
        maxRetries: webhook.maxRetries,
        idempotencyKey,
      });

      await this.queueService.publish(QUEUE_NAMES.WEBHOOK_DELIVER, {
        deliveryId: delivery.id,
        webhookId: webhook.id,
        orgId,
      });
    }
  }

  private validateEvents(events: string[]): void {
    const validEvents = new Set([
      'MESSAGE_RECEIVED', 'MESSAGE_SENT', 'MESSAGE_DELIVERED', 'MESSAGE_FAILED',
      'CONTACT_CREATED', 'CONTACT_UPDATED',
      'CAMPAIGN_COMPLETED', 'CAMPAIGN_FAILED',
      'PAYMENT_SUCCEEDED', 'PAYMENT_FAILED', 'SUBSCRIPTION_CHANGED',
    ]);

    for (const event of events) {
      if (!validEvents.has(event)) {
        throw new BadRequestException(`Invalid webhook event type: ${event}`);
      }
    }
  }
}
