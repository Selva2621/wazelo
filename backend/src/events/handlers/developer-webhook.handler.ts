import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';

/**
 * Listens for incoming WhatsApp messages and delivers them
 * to developer-registered webhooks.
 */
@Injectable()
export class DeveloperWebhookHandler {
  private readonly logger = new Logger(DeveloperWebhookHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async handleIncomingMessage(payload: {
    messageId: string;
    orgId: string;
    contactPhone: string;
    body?: string;
    type?: string;
  }) {
    try {
      // Find active webhooks for this org
      const allWebhooks = await this.prisma.webhook.findMany({
        where: {
          orgId: payload.orgId,
          enabled: true,
          deletedAt: null,
        },
        select: { id: true, url: true, secret: true, headers: true, events: true },
      });

      // Filter webhooks that subscribe to message.received
      const webhooks = allWebhooks.filter((w) => {
        const events = w.events as string[];
        return Array.isArray(events) && events.includes('message.received');
      });

      if (webhooks.length === 0) return;

      // Queue webhook delivery for each registered webhook
      for (const webhook of webhooks) {
        await this.queueService.publish(QUEUE_NAMES.WEBHOOK_DELIVER, {
          webhookId: webhook.id,
          orgId: payload.orgId,
          event: 'message.received',
          payload: {
            messageId: payload.messageId,
            from: payload.contactPhone,
            type: payload.type ?? 'text',
            body: payload.body,
            timestamp: new Date().toISOString(),
          },
        });
      }

      this.logger.debug(
        `Queued ${webhooks.length} developer webhook(s) for message ${payload.messageId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to queue developer webhooks for message ${payload.messageId}`,
        error,
      );
    }
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_DELIVERED)
  async handleMessageStatusUpdate(payload: {
    messageId: string;
    orgId: string;
    status: string;
  }) {
    try {
      const allStatusWebhooks = await this.prisma.webhook.findMany({
        where: {
          orgId: payload.orgId,
          enabled: true,
          deletedAt: null,
        },
        select: { id: true, events: true },
      });

      const webhooks = allStatusWebhooks.filter((w) => {
        const events = w.events as string[];
        return Array.isArray(events) && events.includes('message.status');
      });

      if (webhooks.length === 0) return;

      for (const webhook of webhooks) {
        await this.queueService.publish(QUEUE_NAMES.WEBHOOK_DELIVER, {
          webhookId: webhook.id,
          orgId: payload.orgId,
          event: 'message.status',
          payload: {
            messageId: payload.messageId,
            status: payload.status,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Failed to queue status webhook for message ${payload.messageId}`,
        error,
      );
    }
  }
}
