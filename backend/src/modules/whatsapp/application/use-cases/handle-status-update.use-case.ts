import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { EVENT_NAMES } from '@/common/constants';
import { AuditAction, MessageStatus } from '@prisma/client';

export interface StatusUpdatePayload {
  whatsappMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: number;
  errorCode?: number;
  errorMessage?: string;
}

/** Waits before re-checking an update for a message id not saved yet (~15s in all) */
export const UNKNOWN_MESSAGE_RETRY_MS = [1000, 2000, 4000, 8000];

@Injectable()
export class HandleStatusUpdateUseCase {
  private readonly logger = new Logger(HandleStatusUpdateUseCase.name);

  constructor(
    private readonly messageRepo: MessageRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * WhatsApp can confirm delivery before the send worker has saved the message's
   * WhatsApp id. An update for an unknown id is retried a few times in the
   * background (not awaited, so other updates aren't held up) before it is dropped.
   */
  async execute(payload: StatusUpdatePayload, attempt = 0): Promise<void> {
    const message = await this.messageRepo.findByWhatsAppMessageId(
      payload.whatsappMessageId,
    );
    if (!message) {
      const delay = UNKNOWN_MESSAGE_RETRY_MS[attempt];
      if (delay === undefined) {
        this.logger.warn(
          `Status update for unknown message: ${payload.whatsappMessageId}`,
        );
        return;
      }
      setTimeout(() => {
        this.execute(payload, attempt + 1).catch((err) =>
          this.logger.error(
            `Status update retry failed for ${payload.whatsappMessageId}: ${err instanceof Error ? err.message : String(err)}`,
          ),
        );
      }, delay).unref?.();
      return;
    }

    // Prevent status regression (e.g., going from READ back to DELIVERED)
    if (this.isStatusRegression(message.status, payload.status)) {
      this.logger.log(
        `Ignoring status regression for ${message.id}: ${message.status} → ${payload.status}`,
      );
      return;
    }

    const statusMap: Record<string, MessageStatus> = {
      sent: MessageStatus.SENT,
      delivered: MessageStatus.DELIVERED,
      read: MessageStatus.READ,
      failed: MessageStatus.FAILED,
    };

    const newStatus = statusMap[payload.status];
    if (!newStatus) {
      this.logger.warn(`Unknown status: ${payload.status}`);
      return;
    }

    if (payload.status === 'failed') {
      await this.messageRepo.markFailed(
        message.id,
        payload.errorMessage || `Error code: ${payload.errorCode}`,
      );

      await this.messageEventRepo.record({
        messageId: message.id,
        orgId: message.orgId,
        status: MessageStatus.FAILED,
        error: payload.errorMessage || `Error code: ${payload.errorCode}`,
        metadata: { source: 'whatsapp_webhook', errorCode: payload.errorCode },
      });

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_MESSAGE_FAILED, {
        messageId: message.id,
        sessionId: message.sessionId,
        orgId: message.orgId,
        reason: payload.errorMessage || `Error code: ${payload.errorCode}`,
        retryCount: message.retryCount,
      });
      return;
    }

    await this.messageRepo.updateStatus(message.id, newStatus);

    // Record event for status tracking audit trail (AC3: History stored)
    await this.messageEventRepo.record({
      messageId: message.id,
      orgId: message.orgId,
      status: newStatus,
      metadata: {
        source: 'whatsapp_webhook',
        whatsappTimestamp: payload.timestamp,
      },
    });

    const eventMap: Record<string, string> = {
      sent: EVENT_NAMES.WHATSAPP_MESSAGE_SENT,
      delivered: EVENT_NAMES.WHATSAPP_MESSAGE_DELIVERED,
      read: EVENT_NAMES.WHATSAPP_MESSAGE_READ,
    };

    this.eventEmitter.emit(eventMap[payload.status], {
      messageId: message.id,
      orgId: message.orgId,
      whatsappMessageId: payload.whatsappMessageId,
      ...(payload.status === 'sent' && {
        sessionId: message.sessionId,
        contactPhone: message.contactPhone,
      }),
    });
  }

  private isStatusRegression(current: MessageStatus, incoming: string): boolean {
    const order: Record<string, number> = {
      QUEUED: 0,
      PROCESSING: 1,
      SENT: 2,
      DELIVERED: 3,
      READ: 4,
      FAILED: -1,
    };
    const incomingUpper = incoming.toUpperCase();
    // FAILED can always override; otherwise check order
    if (incomingUpper === 'FAILED') return false;
    return (order[current] || 0) >= (order[incomingUpper] || 0);
  }
}
