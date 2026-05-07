import {
  Injectable,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageStatus } from '@prisma/client';
import { ChannelAdapterRegistry } from './channel-adapter-registry';
import { EVENT_NAMES, QUEUE_NAMES } from '@/common/constants';
import { StatusUpdatePayload } from '../interfaces/channel-adapter.interface';

@Injectable()
export class ChannelWebhookService {
  private readonly logger = new Logger(ChannelWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
    private readonly adapterRegistry: ChannelAdapterRegistry,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async verifyChallenge(
    channelId: string,
    verifyToken: string,
  ): Promise<boolean> {
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
      select: { webhookSecret: true },
    });
    return channel?.webhookSecret === verifyToken;
  }

  async handleInbound(
    channelId: string,
    rawBody: Buffer | undefined,
    signature: string | undefined,
    parsedBody: Record<string, unknown>,
  ): Promise<void> {
    // 1. Load channel
    const channel = await this.prisma.channel.findUnique({
      where: { id: channelId },
    });

    if (!channel || channel.deletedAt) {
      this.logger.warn(
        `Webhook received for unknown/deleted channel: ${channelId}`,
      );
      return;
    }

    // 2. Verify webhook signature — MANDATORY when secret is configured
    if (channel.webhookSecret) {
      if (!signature || !rawBody) {
        this.logger.warn(
          `Missing webhook signature or body for channel ${channelId}`,
        );
        throw new ForbiddenException('Missing webhook signature');
      }
      const adapter = this.adapterRegistry.getAdapter(channel.type);
      const valid = adapter.verifyWebhookSignature(
        rawBody,
        signature,
        channel.webhookSecret,
      );
      if (!valid) {
        this.logger.warn(
          `Invalid webhook signature for channel ${channelId}`,
        );
        throw new ForbiddenException('Invalid webhook signature');
      }
    } else {
      // No webhook secret configured — reject to prevent unsigned payloads
      this.logger.warn(
        `No webhook secret configured for channel ${channelId} — rejecting inbound webhook`,
      );
      throw new ForbiddenException('Webhook not configured');
    }

    const adapter = this.adapterRegistry.getAdapter(channel.type);

    // 3. Try to parse as inbound message
    const inboundMessage = adapter.parseInboundEvent(parsedBody);
    if (inboundMessage) {
      await this.queueService.publish(
        QUEUE_NAMES.PROCESS_CHANNEL_INBOUND,
        {
          channelId,
          channelType: channel.type,
          orgId: channel.orgId,
          payload: inboundMessage,
        },
        {
          singletonKey: `inbound-${inboundMessage.externalMessageId}`,
        },
      );
      return;
    }

    // 4. Try to parse as status update
    const statusUpdate = adapter.parseStatusUpdate(parsedBody);
    if (statusUpdate) {
      await this.handleStatusUpdate(channel.orgId, statusUpdate);
      return;
    }

    // 5. Unknown event type
    this.logger.debug(
      `Unhandled webhook event for channel ${channelId}`,
    );
  }

  private async handleStatusUpdate(
    orgId: string,
    update: StatusUpdatePayload,
  ): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { externalMessageId: update.externalMessageId },
    });

    if (!message) {
      this.logger.debug(
        `Status update for unknown message: ${update.externalMessageId}`,
      );
      return;
    }

    // Only update forward (SENT → DELIVERED → READ, never backward)
    const statusOrder: Record<string, number> = {
      QUEUED: 0,
      PROCESSING: 1,
      SENT: 2,
      DELIVERED: 3,
      READ: 4,
      FAILED: 5,
    };

    const newStatus = update.status as MessageStatus;
    const currentOrder = statusOrder[message.status] || 0;
    const newOrder = statusOrder[newStatus] || 0;

    if (
      newStatus === MessageStatus.FAILED ||
      newOrder > currentOrder
    ) {
      const updateData: Record<string, unknown> = {
        status: newStatus,
      };
      if (newStatus === MessageStatus.DELIVERED) {
        updateData.deliveredAt = new Date();
      }
      if (newStatus === MessageStatus.READ) {
        updateData.readAt = new Date();
      }
      if (newStatus === MessageStatus.FAILED) {
        updateData.failedReason = update.error;
      }

      await this.prisma.message.update({
        where: { id: message.id },
        data: updateData,
      });

      await this.prisma.messageEvent.create({
        data: {
          messageId: message.id,
          orgId,
          status: newStatus,
          error: update.error,
        },
      });

      // Emit typed event
      const eventMap: Record<string, string> = {
        DELIVERED: EVENT_NAMES.CHANNEL_MESSAGE_DELIVERED,
        READ: EVENT_NAMES.CHANNEL_MESSAGE_READ,
        FAILED: EVENT_NAMES.CHANNEL_MESSAGE_FAILED,
      };

      const eventName = eventMap[newStatus];
      if (eventName) {
        this.eventEmitter.emit(eventName, {
          orgId,
          messageId: message.id,
          channelId: message.channelId,
          conversationId: message.conversationId,
          externalMessageId: update.externalMessageId,
          error: update.error,
        });
      }
    }
  }
}
