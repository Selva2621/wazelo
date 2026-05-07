import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ScheduledMessageStatus, WhatsAppSessionStatus } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SchedulerRepository } from '@/modules/scheduler/infrastructure/repositories/scheduler.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_NAMES, EVENT_NAMES, SCHEDULER_CONFIG } from '@/common/constants';

export interface ScheduledMessageExecuteJobData {
  scheduledMessageId: string;
  orgId: string;
  sessionId: string;
  contactPhone: string;
  retryCount: number;
}

@Injectable()
export class ScheduledMessageWorker implements OnModuleInit {
  private readonly logger = new Logger(ScheduledMessageWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly schedulerRepo: SchedulerRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.queueService.subscribe<ScheduledMessageExecuteJobData>(
      QUEUE_NAMES.SCHEDULED_MESSAGE_EXECUTE,
      async (job) => this.handleExecute(job.data, job.id),
    );

    this.logger.log('Scheduled message worker started');
  }

  /**
   * Periodic checker: scans for PENDING scheduled messages whose scheduledAt has passed.
   * Runs every 15 seconds to meet AC1 (±2s accuracy).
   */
  @Cron(`*/${SCHEDULER_CONFIG.CHECK_INTERVAL_SECONDS} * * * * *`)
  async checkDueMessages(): Promise<void> {
    try {
      const dueMessages = await this.schedulerRepo.findDueMessages(50);

      if (dueMessages.length === 0) return;

      this.logger.debug(`Found ${dueMessages.length} due scheduled messages`);

      for (const message of dueMessages) {
        // Atomically transition to QUEUED to prevent duplicate processing
        const transitioned = await this.schedulerRepo.transitionStatus(
          message.id,
          ScheduledMessageStatus.PENDING,
          ScheduledMessageStatus.QUEUED,
        );

        if (!transitioned) {
          // Already picked up by another worker instance
          continue;
        }

        // Queue execution job
        const jobId = await this.queueService.publishOnce(
          QUEUE_NAMES.SCHEDULED_MESSAGE_EXECUTE,
          {
            scheduledMessageId: message.id,
            orgId: message.orgId,
            sessionId: message.sessionId,
            contactPhone: message.contactPhone,
            retryCount: 0,
          },
          `sched-exec-${message.id}`,
        );

        if (jobId) {
          await this.schedulerRepo.updatePgBossJobId(message.id, jobId);
        }
      }
    } catch (error) {
      this.logger.error(
        'Error checking due scheduled messages',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async handleExecute(
    data: ScheduledMessageExecuteJobData,
    jobId: string,
  ): Promise<void> {
    this.logger.debug(
      `Executing scheduled message: ${data.scheduledMessageId} job=${jobId}`,
    );

    try {
      // 1. Reload the message to check current status (might have been cancelled)
      const message = await this.schedulerRepo.findByIdAndOrg(
        data.scheduledMessageId,
        data.orgId,
      );

      if (!message) {
        this.logger.warn(
          `Scheduled message not found: ${data.scheduledMessageId}`,
        );
        return;
      }

      if (message.status === ScheduledMessageStatus.CANCELLED) {
        this.logger.debug(
          `Scheduled message was cancelled: ${data.scheduledMessageId}`,
        );
        return;
      }

      if (message.status !== ScheduledMessageStatus.QUEUED) {
        this.logger.warn(
          `Scheduled message in unexpected status: ${message.status} id=${data.scheduledMessageId}`,
        );
        return;
      }

      // 2. Check WhatsApp session is still connected
      const session = await this.sessionRepo.findByIdAndOrg(
        data.sessionId,
        data.orgId,
      );

      if (!session || session.status !== WhatsAppSessionStatus.CONNECTED) {
        // Session disconnected — retry with backoff
        if (data.retryCount < SCHEDULER_CONFIG.MAX_RETRIES) {
          const delay =
            SCHEDULER_CONFIG.RETRY_BASE_DELAY_SECONDS *
            Math.pow(2, data.retryCount);

          this.logger.warn(
            `Session not connected for scheduled message ${data.scheduledMessageId}, retrying in ${delay}s (attempt ${data.retryCount + 1})`,
          );

          await this.schedulerRepo.incrementRetryCount(
            data.scheduledMessageId,
            'WhatsApp session not connected',
          );

          await this.queueService.publishDelayed(
            QUEUE_NAMES.SCHEDULED_MESSAGE_EXECUTE,
            { ...data, retryCount: data.retryCount + 1 },
            delay,
          );

          return;
        }

        // Max retries exceeded — mark as failed
        await this.schedulerRepo.transitionStatus(
          data.scheduledMessageId,
          ScheduledMessageStatus.QUEUED,
          ScheduledMessageStatus.FAILED,
          { failedReason: 'WhatsApp session not connected after max retries' },
        );

        this.eventEmitter.emit(EVENT_NAMES.SCHEDULED_MESSAGE_FAILED, {
          scheduledMessageId: data.scheduledMessageId,
          orgId: data.orgId,
          reason: 'WhatsApp session not connected after max retries',
          retryCount: data.retryCount,
        });

        return;
      }

      // 3. Queue the actual WhatsApp message via the messaging engine
      const idempotencyKey = `sched-msg-${data.scheduledMessageId}`;

      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        {
          orgId: data.orgId,
          sessionId: data.sessionId,
          contactPhone: data.contactPhone,
          type: message.messageType,
          body: message.messageBody,
          mediaUrl: message.mediaUrl,
          mediaMimeType: message.mediaMimeType,
          metadata: {
            scheduledMessageId: data.scheduledMessageId,
            ...(message.metadata as Record<string, unknown> || {}),
          },
          idempotencyKey,
        },
        idempotencyKey,
      );

      // 4. Mark as SENT
      await this.schedulerRepo.transitionStatus(
        data.scheduledMessageId,
        ScheduledMessageStatus.QUEUED,
        ScheduledMessageStatus.SENT,
      );

      // 5. Emit success event
      this.eventEmitter.emit(EVENT_NAMES.SCHEDULED_MESSAGE_EXECUTED, {
        scheduledMessageId: data.scheduledMessageId,
        orgId: data.orgId,
        messageId: idempotencyKey,
        contactPhone: data.contactPhone,
      });

      this.logger.log(
        `Scheduled message executed: ${data.scheduledMessageId} org=${data.orgId}`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.logger.error(
        `Failed to execute scheduled message: ${data.scheduledMessageId}`,
        error instanceof Error ? error.stack : undefined,
      );

      // Retry handling
      if (data.retryCount < SCHEDULER_CONFIG.MAX_RETRIES) {
        await this.schedulerRepo.incrementRetryCount(
          data.scheduledMessageId,
          errorMessage,
        );

        throw error; // Let pg-boss handle retry with backoff
      }

      // Max retries exceeded
      await this.schedulerRepo.transitionStatus(
        data.scheduledMessageId,
        ScheduledMessageStatus.QUEUED,
        ScheduledMessageStatus.FAILED,
        { failedReason: `Failed after ${data.retryCount} retries: ${errorMessage}` },
      );

      this.eventEmitter.emit(EVENT_NAMES.SCHEDULED_MESSAGE_FAILED, {
        scheduledMessageId: data.scheduledMessageId,
        orgId: data.orgId,
        reason: errorMessage,
        retryCount: data.retryCount,
      });
    }
  }
}
