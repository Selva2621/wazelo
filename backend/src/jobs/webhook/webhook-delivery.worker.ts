import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import * as PgBoss from 'pg-boss';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SettingsRepository } from '@/modules/settings/infrastructure/repositories/settings.repository';
import { WebhookSigningService } from '@/modules/settings/domain/services/webhook-signing.service';
import { QUEUE_NAMES, EVENT_NAMES, SETTINGS_CONFIG } from '@/common/constants';
import { WebhookDeliveryStatus } from '@prisma/client';

interface WebhookDeliverJob {
  deliveryId: string;
  webhookId: string;
  orgId: string;
}

@Injectable()
export class WebhookDeliveryWorker implements OnModuleInit {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly settingsRepository: SettingsRepository,
    private readonly webhookSigningService: WebhookSigningService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<WebhookDeliverJob>(
      QUEUE_NAMES.WEBHOOK_DELIVER,
      async (job: PgBoss.Job<WebhookDeliverJob>) => {
        await this.handleDelivery(job.data);
      },
      SETTINGS_CONFIG.WEBHOOK_WORKER_CONCURRENCY,
    );

    // Also subscribe to the retry queue
    await this.queueService.subscribeConcurrent<WebhookDeliverJob>(
      QUEUE_NAMES.WEBHOOK_RETRY,
      async (job: PgBoss.Job<WebhookDeliverJob>) => {
        await this.handleDelivery(job.data);
      },
      SETTINGS_CONFIG.WEBHOOK_WORKER_CONCURRENCY,
    );

    this.logger.log('Webhook delivery worker started');
  }

  private async handleDelivery(data: WebhookDeliverJob): Promise<void> {
    const { deliveryId, webhookId, orgId } = data;

    const delivery = await this.settingsRepository.findWebhookDeliveryById(deliveryId);
    if (!delivery) {
      this.logger.warn(`Webhook delivery ${deliveryId} not found, skipping`);
      return;
    }

    // Skip if already succeeded
    if (delivery.status === WebhookDeliveryStatus.SUCCESS) {
      return;
    }

    const webhook = await this.settingsRepository.findWebhookById(webhookId, orgId);
    if (!webhook || !webhook.enabled || webhook.deletedAt) {
      this.logger.warn(`Webhook ${webhookId} not found or disabled, marking delivery failed`);
      await this.settingsRepository.updateWebhookDelivery(deliveryId, {
        status: WebhookDeliveryStatus.FAILED,
        error: 'Webhook not found or disabled',
      });
      return;
    }

    const payloadString = JSON.stringify(delivery.payload);
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = this.webhookSigningService.sign(payloadString, webhook.secret, timestamp);

    const startTime = Date.now();
    let httpStatus: number | undefined;
    let responseBody: string | undefined;
    let error: string | undefined;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), webhook.timeoutMs);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': signature,
        'X-Webhook-Timestamp': String(timestamp),
        'X-Webhook-Id': deliveryId,
        ...(webhook.headers as Record<string, string> ?? {}),
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: payloadString,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      httpStatus = response.status;
      // Limit response body size to prevent memory issues
      responseBody = (await response.text()).slice(0, 2048);

      if (response.ok) {
        // Success — mark delivered
        const durationMs = Date.now() - startTime;
        await this.settingsRepository.updateWebhookDelivery(deliveryId, {
          status: WebhookDeliveryStatus.SUCCESS,
          httpStatus,
          responseBody,
          duration: durationMs,
        });

        await this.settingsRepository.resetWebhookFailureCount(webhookId);

        this.eventEmitter.emit(EVENT_NAMES.WEBHOOK_DELIVERED, {
          deliveryId,
          webhookId,
          orgId,
          eventType: delivery.eventType,
          httpStatus,
          durationMs,
        });

        return;
      }

      // Non-2xx response
      error = `HTTP ${httpStatus}: ${responseBody?.slice(0, 256)}`;
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === 'AbortError') {
        error = `Timeout after ${webhook.timeoutMs}ms`;
      }
    }

    const durationMs = Date.now() - startTime;
    const retryCount = delivery.retryCount + 1;
    const willRetry = retryCount < delivery.maxRetries;

    if (willRetry) {
      // Schedule retry with exponential backoff
      const delaySeconds =
        SETTINGS_CONFIG.WEBHOOK_RETRY_BASE_DELAY_SECONDS * Math.pow(2, retryCount - 1);

      await this.settingsRepository.updateWebhookDelivery(deliveryId, {
        status: WebhookDeliveryStatus.RETRYING,
        httpStatus: httpStatus ?? null,
        responseBody: responseBody ?? null,
        error,
        retryCount,
        nextRetryAt: new Date(Date.now() + delaySeconds * 1000),
        duration: durationMs,
      });

      await this.queueService.publishDelayed(
        QUEUE_NAMES.WEBHOOK_RETRY,
        { deliveryId, webhookId, orgId },
        delaySeconds,
      );
    } else {
      // Final failure
      await this.settingsRepository.updateWebhookDelivery(deliveryId, {
        status: WebhookDeliveryStatus.FAILED,
        httpStatus: httpStatus ?? null,
        responseBody: responseBody ?? null,
        error,
        retryCount,
        duration: durationMs,
      });

      // Increment failure count and potentially auto-disable
      const updatedWebhook = await this.settingsRepository.incrementWebhookFailureCount(webhookId);
      if (updatedWebhook.failureCount >= SETTINGS_CONFIG.WEBHOOK_AUTO_DISABLE_THRESHOLD) {
        await this.settingsRepository.autoDisableWebhook(webhookId);
        this.logger.warn(
          `Webhook ${webhookId} auto-disabled after ${updatedWebhook.failureCount} consecutive failures`,
        );
      }
    }

    this.eventEmitter.emit(EVENT_NAMES.WEBHOOK_DELIVERY_FAILED, {
      deliveryId,
      webhookId,
      orgId,
      eventType: delivery.eventType,
      error,
      retryCount,
      willRetry,
    });
  }
}
