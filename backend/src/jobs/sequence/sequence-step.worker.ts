import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { SequenceRepository } from '@/modules/sequences/infrastructure/repositories/sequence.repository';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { QUEUE_NAMES, EVENT_NAMES } from '@/common/constants';
import { MessageDirection, MessageType, SequenceStatus, CampaignRecipientStatus } from '@prisma/client';

/**
 * Periodic worker that checks for sequence recipients whose next step is due,
 * creates the message, and advances them to the next step.
 */
@Injectable()
export class SequenceStepWorker implements OnModuleInit {
  private readonly logger = new Logger(SequenceStepWorker.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly sequenceRepo: SequenceRepository,
    private readonly messageRepo: MessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit(): Promise<void> {
    // Subscribe to periodic check (every 30 seconds)
    await this.queueService.subscribe(
      QUEUE_NAMES.SEQUENCE_STEP_CHECK,
      async () => this.checkDueSteps(),
    );

    // Schedule periodic check
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEQUENCE_STEP_CHECK,
      {},
      'sequence-step-check-singleton',
      {
        retryLimit: 0,
        singletonSeconds: 30,
      },
    );

    // Subscribe to individual step sends
    await this.queueService.subscribeConcurrent<{
      recipientId: string;
      stepId: string;
      orgId: string;
      sequenceId: string;
      sessionId: string;
    }>(
      QUEUE_NAMES.SEQUENCE_SEND_STEP,
      async (job) => this.sendStep(job.data),
      3,
    );

    this.logger.log('SequenceStepWorker subscribed');
  }

  private async checkDueSteps(): Promise<void> {
    const now = new Date();
    const dueRecipients = await this.sequenceRepo.getActiveRecipientsForStep(undefined, now, 100);

    // Filter: only those whose parent sequence is still ACTIVE
    const eligible = dueRecipients.filter(
      (r) => r.sequence.status === SequenceStatus.ACTIVE,
    );

    for (const recipient of eligible) {
      await this.queueService.publishOnce(
        QUEUE_NAMES.SEQUENCE_SEND_STEP,
        {
          recipientId: recipient.id,
          stepId: '', // resolved in sendStep
          orgId: recipient.orgId,
          sequenceId: recipient.sequenceId,
          sessionId: recipient.sequence.sessionId,
        },
        `seq-step-${recipient.id}-${recipient.currentStep}`,
        { retryLimit: 2, retryBackoff: true },
      );
    }

    // Re-schedule self
    await this.queueService.publishOnce(
      QUEUE_NAMES.SEQUENCE_STEP_CHECK,
      {},
      'sequence-step-check-singleton',
      {
        retryLimit: 0,
        singletonSeconds: 30,
      },
    );
  }

  private async sendStep(data: {
    recipientId: string;
    orgId: string;
    sequenceId: string;
    sessionId: string;
  }): Promise<void> {
    const { recipientId, orgId, sequenceId, sessionId } = data;

    // Get all steps for sequence
    const steps = await this.sequenceRepo.getStepsBySequence(sequenceId);
    if (!steps.length) return;

    // Re-fetch recipient (freshest state)
    const recipients = await this.sequenceRepo.getActiveRecipientsForStep(orgId, new Date(), 1);
    const recipient = recipients.find((r) => r.id === recipientId);
    if (!recipient || recipient.status !== 'ACTIVE') return;

    const nextStepIndex = recipient.currentStep; // 0-based: currentStep is the NEXT step to send
    if (nextStepIndex >= steps.length) {
      // All steps completed
      await this.sequenceRepo.completeRecipient(recipientId);
      await this.sequenceRepo.updateSequenceCounters(sequenceId);
      return;
    }

    const step = steps[nextStepIndex];

    try {
      // Create message
      const message = await this.messageRepo.create({
        orgId,
        sessionId,
        direction: MessageDirection.OUTBOUND,
        type: (step.messageType as MessageType) || MessageType.TEXT,
        contactPhone: recipient.contactPhone,
        body: step.messageBody ?? undefined,
        mediaUrl: step.mediaUrl ?? undefined,
        mediaMimeType: step.mediaMimeType ?? undefined,
        idempotencyKey: `seq-${sequenceId}-${recipientId}-step-${step.stepOrder}`,
        priority: -1, // lower than direct messages
        maxRetries: 3,
      });

      // Record recipient step
      const recipientStep = await this.sequenceRepo.createRecipientStep({
        recipientId,
        stepId: step.id,
        orgId,
        scheduledAt: new Date(),
      });

      await this.sequenceRepo.updateRecipientStepStatus(
        recipientStep.id,
        CampaignRecipientStatus.QUEUED,
        { messageId: message.id, processedAt: new Date() },
      );

      // Queue for WhatsApp delivery
      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        { messageId: message.id, sessionId, orgId },
        `msg-${message.id}`,
        { retryLimit: 3, retryBackoff: true, priority: -1 },
      );

      // Advance recipient to next step
      const nextIndex = nextStepIndex + 1;
      let nextStepAt: Date | null = null;

      if (nextIndex < steps.length) {
        const nextStep = steps[nextIndex];
        nextStepAt = new Date(Date.now() + nextStep.delayMinutes * 60 * 1000);
      }

      await this.sequenceRepo.advanceRecipient(recipientId, nextIndex, nextStepAt);

      // If no more steps, complete
      if (nextIndex >= steps.length) {
        await this.sequenceRepo.completeRecipient(recipientId);
      }

      await this.sequenceRepo.updateSequenceCounters(sequenceId);

      this.logger.debug(
        `Sequence ${sequenceId}: sent step ${step.stepOrder} to ${recipient.contactPhone}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send sequence step for recipient ${recipientId}: ${error}`,
      );
    }
  }
}
