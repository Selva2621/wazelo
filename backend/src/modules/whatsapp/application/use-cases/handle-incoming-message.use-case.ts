import { Injectable, Logger } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { QUEUE_NAMES } from '@/common/constants';

export interface IncomingMessagePayload {
  sessionId: string;
  whatsappMessageId: string;
  contactPhone: string;
  contactName?: string;
  type: string;
  body?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  mediaSize?: number;
  timestamp: number;
}

/**
 * Entry point for incoming WhatsApp messages.
 * Performs quick deduplication check, then queues for reliable processing.
 *
 * Design: persist-via-queue pattern — the IncomingMessageWorker handles
 * full persistence, conversation creation, and event emission. This use-case
 * is intentionally thin to keep the Baileys bridge event handler fast.
 */
@Injectable()
export class HandleIncomingMessageUseCase {
  private readonly logger = new Logger(HandleIncomingMessageUseCase.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly messageRepo: MessageRepository,
  ) {}

  async execute(payload: IncomingMessagePayload): Promise<void> {
    // Quick deduplication check (fast path for duplicate webhooks)
    const existing = await this.messageRepo.findByWhatsAppMessageId(
      payload.whatsappMessageId,
    );
    if (existing) {
      this.logger.log(`Duplicate incoming message: ${payload.whatsappMessageId}`);
      return;
    }

    // Queue for reliable processing with singletonKey to prevent duplicate jobs
    await this.queueService.publishOnce(
      QUEUE_NAMES.PROCESS_INCOMING_MESSAGE,
      payload,
      `incoming-${payload.whatsappMessageId}`,
    );

    this.logger.log(
      `Incoming message queued: ${payload.whatsappMessageId} from ${payload.contactPhone}`,
    );
  }
}
