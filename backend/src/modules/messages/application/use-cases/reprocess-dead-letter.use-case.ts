import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeadLetterRepository } from '../../infrastructure/repositories/dead-letter.repository';
import { MessageRepository } from '../../infrastructure/repositories/message.repository';
import { MessageEventRepository } from '../../infrastructure/repositories/message-event.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES, EVENT_NAMES, MESSAGING_CONFIG } from '@/common/constants';
import { MessageStatus } from '@prisma/client';

@Injectable()
export class ReprocessDeadLetterUseCase {
  private readonly logger = new Logger(ReprocessDeadLetterUseCase.name);

  constructor(
    private readonly deadLetterRepo: DeadLetterRepository,
    private readonly messageRepo: MessageRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly queueService: QueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(deadLetterId: string, orgId: string, userId: string) {
    const dlm = await this.deadLetterRepo.findById(deadLetterId);
    if (!dlm || dlm.orgId !== orgId) {
      throw new NotFoundException('Dead-letter message not found');
    }

    if (dlm.reprocessedAt) {
      throw new BadRequestException('This dead-letter message has already been reprocessed');
    }

    // Reset original message to QUEUED for re-sending
    const message = await this.messageRepo.findById(dlm.originalMessageId);
    if (!message) {
      throw new NotFoundException('Original message no longer exists');
    }

    await this.messageRepo.updateStatus(message.id, MessageStatus.QUEUED, {
      retryCount: 0,
      failedReason: null,
      nextRetryAt: null,
      processingAt: null,
    });

    await this.messageEventRepo.record({
      messageId: message.id,
      orgId,
      status: MessageStatus.QUEUED,
      metadata: { reprocessedFrom: deadLetterId, reprocessedBy: userId },
    });

    // Queue for retry
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
      {
        messageId: message.id,
        sessionId: message.sessionId,
        orgId,
      },
      `msg-reprocess-${message.id}`,
      {
        retryLimit: MESSAGING_CONFIG.MAX_RETRY_COUNT,
        retryDelay: MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS,
        retryBackoff: true,
      },
    );

    // Mark dead-letter as reprocessed
    await this.deadLetterRepo.markReprocessed(deadLetterId);

    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_REPROCESSED, {
      deadLetterId,
      messageId: message.id,
      orgId,
      userId,
    });

    this.logger.log(`Dead-letter ${deadLetterId} reprocessed for message ${message.id}`);

    return { message, deadLetter: { ...dlm, reprocessedAt: new Date() } };
  }
}
