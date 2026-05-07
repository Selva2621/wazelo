import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { WhatsAppApiService } from '@/infrastructure/external/whatsapp/whatsapp-api.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { DeadLetterRepository } from '@/modules/messages/infrastructure/repositories/dead-letter.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { RateLimiterService } from '@/modules/messages/domain/services/rate-limiter.service';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  QUEUE_NAMES,
  EVENT_NAMES,
  MESSAGING_CONFIG,
} from '@/common/constants';
import { AuditAction, MessageStatus, MessageType } from '@prisma/client';

interface SendMessageJobData {
  messageId: string;
  sessionId: string;
  orgId: string;
}

/**
 * Non-retryable errors that should immediately dead-letter the message.
 * Retrying these will never succeed.
 */
const NON_RETRYABLE_ERRORS = [
  'invalid phone number',
  'number not on whatsapp',
  'media too large',
  'unsupported media type',
  'blocked by user',
  'account banned',
  'invalid session',
];

function isRetryableError(error: string): boolean {
  const lower = error.toLowerCase();
  return !NON_RETRYABLE_ERRORS.some((pattern) => lower.includes(pattern));
}

/**
 * Calculate exponential backoff delay.
 * Formula: base * 2^attempt, capped at maxDelay.
 * Adds jitter (0-25%) to prevent thundering herd.
 */
function calculateBackoffDelay(attempt: number): number {
  const base = MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS;
  const max = MESSAGING_CONFIG.RETRY_MAX_DELAY_SECONDS;
  const delay = Math.min(base * Math.pow(2, attempt), max);
  const jitter = delay * 0.25 * Math.random();
  return Math.round(delay + jitter);
}

@Injectable()
export class SendMessageWorker implements OnModuleInit {
  private readonly logger = new Logger(SendMessageWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly whatsappApi: WhatsAppApiService,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly deadLetterRepo: DeadLetterRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly rateLimiter: RateLimiterService,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribeConcurrent<SendMessageJobData>(
      QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
      async (job) => this.handle(job.data, job.id),
      MESSAGING_CONFIG.WORKER_CONCURRENCY,
    );
    this.logger.log(
      `SendMessageWorker subscribed (concurrency=${MESSAGING_CONFIG.WORKER_CONCURRENCY})`,
    );
  }

  private async handle(data: SendMessageJobData, jobId: string): Promise<void> {
    const { messageId, sessionId, orgId } = data;

    // 1. Load message
    const message = await this.messageRepo.findById(messageId);
    if (!message) {
      this.logger.warn(`Message ${messageId} not found, skipping job ${jobId}`);
      return;
    }

    // 2. Idempotency: skip if already sent or beyond QUEUED state
    if (
      message.status === MessageStatus.SENT ||
      message.status === MessageStatus.DELIVERED ||
      message.status === MessageStatus.READ ||
      message.whatsappMessageId
    ) {
      this.logger.log(`Message ${messageId} already processed (${message.status}), skipping`);
      return;
    }

    // 3. Atomically transition QUEUED → PROCESSING (prevents duplicate processing)
    const transitioned = await this.messageRepo.transitionStatus(
      messageId,
      MessageStatus.QUEUED,
      MessageStatus.PROCESSING,
    );

    if (!transitioned) {
      // Another worker already picked this up or status changed
      this.logger.log(`Message ${messageId} status already changed, skipping (concurrent)`);
      return;
    }

    await this.messageEventRepo.record({
      messageId,
      orgId,
      status: MessageStatus.PROCESSING,
      metadata: { jobId, attempt: message.retryCount },
    });

    this.eventEmitter.emit(EVENT_NAMES.MESSAGE_PROCESSING, {
      messageId,
      sessionId,
      orgId,
    });

    // 4. Rate limit check at worker level (defense-in-depth)
    const rateResult = await this.rateLimiter.checkLimit(sessionId, orgId);
    if (!rateResult.allowed) {
      // Re-queue with delay instead of failing
      const delaySeconds = rateResult.retryAfterSeconds;
      this.logger.warn(
        `Rate limited for session ${sessionId}, re-queuing message ${messageId} with ${delaySeconds}s delay`,
      );

      await this.messageRepo.updateStatus(messageId, MessageStatus.QUEUED, {
        processingAt: null,
        nextRetryAt: new Date(Date.now() + delaySeconds * 1000),
      });

      await this.queueService.publishDelayed(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        { messageId, sessionId, orgId },
        delaySeconds,
        { singletonKey: `msg-delayed-${messageId}` },
      );
      return;
    }

    // 5. Verify session is connected
    if (!this.whatsappApi.isSessionConnected(sessionId)) {
      const session = await this.sessionRepo.findById(sessionId);
      if (!session || session.status !== 'CONNECTED') {
        await this.handleFailure(
          message,
          jobId,
          'Session not connected',
          false, // not retryable — session must be reconnected first
        );
        return;
      }
    }

    // 6. Send via WhatsApp API
    try {
      let result;

      if (message.type === 'TEXT') {
        result = await this.whatsappApi.sendTextMessage(
          sessionId,
          message.contactPhone,
          message.body!,
        );
      } else if (message.type === 'INTERACTIVE') {
        const payload = message.interactivePayload as Record<string, unknown>;
        if (!payload) {
          await this.handleFailure(message, jobId, 'Interactive payload missing', false);
          return;
        }
        result = await this.whatsappApi.sendInteractiveMessage(
          sessionId,
          message.contactPhone,
          payload,
        );
      } else {
        result = await this.whatsappApi.sendMediaMessage(
          sessionId,
          message.contactPhone,
          message.type,
          message.mediaUrl!,
          message.body || undefined,
        );
      }

      // 7. Success — update message with WhatsApp ID + SENT status
      await this.messageRepo.setWhatsAppMessageId(messageId, result.whatsappMessageId);

      await this.messageEventRepo.record({
        messageId,
        orgId,
        status: MessageStatus.SENT,
        metadata: {
          whatsappMessageId: result.whatsappMessageId,
          jobId,
          attempt: message.retryCount,
        },
      });

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_MESSAGE_SENT, {
        messageId,
        sessionId,
        orgId,
        contactPhone: message.contactPhone,
        whatsappMessageId: result.whatsappMessageId,
      });

      // Enqueue SLA evaluation for outbound reply
      if (message.conversationId) {
        const conversation = await this.conversationRepo.findById(message.conversationId);
        await this.queueService.publishOnce(
          QUEUE_NAMES.SLA_EVALUATE,
          {
            type: 'outbound_reply',
            orgId,
            conversationId: message.conversationId,
            sessionId,
            assignedUserId: conversation?.assignedToId ?? null,
            messageCreatedAt: new Date().toISOString(),
          },
          `sla:outbound:${messageId}`,
        );
      }

      this.logger.log(`Message ${messageId} sent successfully (waId=${result.whatsappMessageId})`);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to send message ${messageId}: ${reason}`);

      await this.handleFailure(message, jobId, reason, isRetryableError(reason));
    }
  }

  /**
   * Handle message send failure.
   * - Retryable errors: re-queue with exponential backoff
   * - Non-retryable errors or max retries exhausted: dead-letter
   */
  private async handleFailure(
    message: Record<string, any>,
    jobId: string,
    reason: string,
    retryable: boolean,
  ): Promise<void> {
    const messageId = message.id;
    const orgId = message.orgId;
    const currentRetry = message.retryCount;
    const maxRetries = message.maxRetries ?? MESSAGING_CONFIG.MAX_RETRY_COUNT;

    if (retryable && currentRetry < maxRetries) {
      // Schedule retry with exponential backoff
      const delaySeconds = calculateBackoffDelay(currentRetry);
      const nextRetryAt = new Date(Date.now() + delaySeconds * 1000);

      await this.messageRepo.markForRetry(messageId, reason, nextRetryAt);

      await this.messageEventRepo.record({
        messageId,
        orgId,
        status: MessageStatus.QUEUED,
        error: reason,
        metadata: {
          retryAttempt: currentRetry + 1,
          nextRetryAt: nextRetryAt.toISOString(),
          delaySeconds,
          jobId,
        },
      });

      // Re-queue with delay
      await this.queueService.publishDelayed(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        {
          messageId,
          sessionId: message.sessionId,
          orgId,
        },
        delaySeconds,
        { singletonKey: `msg-retry-${messageId}-${currentRetry + 1}` },
      );

      await this.auditService.log({
        orgId,
        action: AuditAction.MESSAGE_RETRY,
        targetType: 'Message',
        targetId: messageId,
        metadata: {
          reason,
          retryAttempt: currentRetry + 1,
          maxRetries,
          delaySeconds,
        },
      });

      this.logger.log(
        `Message ${messageId} scheduled for retry ${currentRetry + 1}/${maxRetries} in ${delaySeconds}s`,
      );
    } else {
      // Dead-letter: permanent failure
      await this.messageRepo.markFailed(messageId, reason);

      await this.messageEventRepo.record({
        messageId,
        orgId,
        status: MessageStatus.FAILED,
        error: reason,
        metadata: {
          deadLettered: true,
          retryCount: currentRetry,
          retryable,
          jobId,
        },
      });

      // Create dead-letter record
      await this.deadLetterRepo.create({
        orgId,
        originalMessageId: messageId,
        sessionId: message.sessionId,
        contactPhone: message.contactPhone,
        type: message.type as MessageType,
        body: message.body,
        mediaUrl: message.mediaUrl,
        failedReason: reason,
        retryCount: currentRetry,
        lastJobId: jobId,
        metadata: message.metadata as Record<string, unknown> | undefined,
      });

      await this.auditService.log({
        orgId,
        action: AuditAction.MESSAGE_DEAD_LETTERED,
        targetType: 'Message',
        targetId: messageId,
        metadata: {
          reason,
          retryCount: currentRetry,
          retryable,
          contactPhone: message.contactPhone,
        },
      });

      this.eventEmitter.emit(EVENT_NAMES.WHATSAPP_MESSAGE_FAILED, {
        messageId,
        sessionId: message.sessionId,
        orgId,
        reason,
        retryCount: currentRetry,
      });

      this.eventEmitter.emit(EVENT_NAMES.MESSAGE_DEAD_LETTERED, {
        messageId,
        orgId,
        reason,
        retryCount: currentRetry,
      });

      this.logger.warn(
        `Message ${messageId} dead-lettered after ${currentRetry} retries: ${reason}`,
      );
    }
  }
}
