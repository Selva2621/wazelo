import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { DeadLetterRepository } from '@/modules/messages/infrastructure/repositories/dead-letter.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { QUEUE_NAMES, MESSAGING_CONFIG } from '@/common/constants';
import { AuditAction, MessageStatus, MessageType } from '@prisma/client';

/**
 * Cron-based recovery worker for messages stuck in bad states.
 *
 * Handles three scenarios:
 * 1. PROCESSING messages where the worker crashed (stale processing)
 * 2. QUEUED messages that lost their pg-boss job reference (orphaned)
 * 3. FAILED messages that are below retry threshold (missed retries)
 *
 * Runs every 30 seconds to minimize message delivery latency.
 */
@Injectable()
export class MessageRecoveryWorker {
  private readonly logger = new Logger(MessageRecoveryWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly messageRepo: MessageRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly deadLetterRepo: DeadLetterRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Recover messages stuck in PROCESSING state.
   * These are from worker crashes — the worker set PROCESSING but never completed.
   */
  @Cron('*/30 * * * * *')
  async recoverStaleProcessing(): Promise<void> {
    const staleMessages = await this.messageRepo.findStaleProcessingMessages(
      MESSAGING_CONFIG.PROCESSING_STALE_THRESHOLD_MS,
    );

    if (staleMessages.length === 0) return;

    this.logger.warn(`Found ${staleMessages.length} stale PROCESSING messages`);

    for (const message of staleMessages) {
      if (message.retryCount >= (message.maxRetries ?? MESSAGING_CONFIG.MAX_RETRY_COUNT)) {
        // Exhausted retries → dead-letter
        await this.messageRepo.markFailed(message.id, 'Worker crash: max retries exhausted');

        await this.deadLetterRepo.create({
          orgId: message.orgId,
          originalMessageId: message.id,
          sessionId: message.sessionId ?? undefined,
          contactPhone: message.contactPhone,
          type: message.type as MessageType,
          body: message.body ?? undefined,
          mediaUrl: message.mediaUrl ?? undefined,
          failedReason: 'Worker crash: max retries exhausted during processing',
          retryCount: message.retryCount,
          metadata: { recoveredBy: 'MessageRecoveryWorker', originalStatus: 'PROCESSING' },
        });

        await this.messageEventRepo.record({
          messageId: message.id,
          orgId: message.orgId,
          status: MessageStatus.FAILED,
          error: 'Worker crash recovery: dead-lettered',
          metadata: { recoveredBy: 'cron', originalProcessingAt: message.processingAt },
        });

        await this.auditService.log({
          orgId: message.orgId,
          action: AuditAction.MESSAGE_DEAD_LETTERED,
          targetType: 'Message',
          targetId: message.id,
          metadata: { reason: 'Worker crash recovery', retryCount: message.retryCount },
        });

        this.logger.warn(`Stale message ${message.id} dead-lettered after crash recovery`);
      } else {
        // Reset to QUEUED and re-queue
        const nextRetryAt = new Date(Date.now() + 5000); // 5s delay
        await this.messageRepo.markForRetry(
          message.id,
          'Worker crash recovery: re-queued',
          nextRetryAt,
        );

        await this.queueService.publishOnce(
          QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
          {
            messageId: message.id,
            sessionId: message.sessionId,
            orgId: message.orgId,
          },
          `msg-recover-${message.id}`,
          { startAfter: 5 },
        );

        await this.messageEventRepo.record({
          messageId: message.id,
          orgId: message.orgId,
          status: MessageStatus.QUEUED,
          error: 'Worker crash recovery: re-queued',
          metadata: {
            recoveredBy: 'cron',
            originalProcessingAt: message.processingAt,
            retryCount: message.retryCount,
          },
        });

        this.logger.log(`Stale message ${message.id} recovered and re-queued`);
      }
    }
  }

  /**
   * Recover messages stuck in QUEUED state for too long.
   * These may have lost their pg-boss job (job expired, DB issue, etc).
   */
  @Cron('*/60 * * * * *')
  async recoverStaleQueued(): Promise<void> {
    const staleMessages = await this.messageRepo.findStaleQueuedMessages(
      MESSAGING_CONFIG.QUEUED_STALE_THRESHOLD_MS,
    );

    if (staleMessages.length === 0) return;

    this.logger.warn(`Found ${staleMessages.length} stale QUEUED messages`);

    for (const message of staleMessages) {
      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        {
          messageId: message.id,
          sessionId: message.sessionId,
          orgId: message.orgId,
        },
        `msg-stale-${message.id}`,
      );

      await this.messageEventRepo.record({
        messageId: message.id,
        orgId: message.orgId,
        status: MessageStatus.QUEUED,
        error: 'Stale queue recovery: job re-published',
        metadata: {
          recoveredBy: 'cron',
          originalCreatedAt: message.createdAt,
          staleDurationMs: Date.now() - message.createdAt.getTime(),
        },
      });

      this.logger.log(`Stale QUEUED message ${message.id} re-published to queue`);
    }
  }
}
