import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { SequenceRepository } from '@/modules/sequences/infrastructure/repositories/sequence.repository';

/**
 * Handles exit-on-reply and conditional branching for drip sequences.
 * When a contact replies while in an active sequence:
 * 1. Check if the current step has conditions (keyword → jump to step)
 * 2. If keyword matches → jump recipient to that step
 * 3. If no match + exitOnReply → exit the sequence
 * 4. If no match + !exitOnReply → continue normally
 */
@Injectable()
export class SequenceEventsHandler {
  private readonly logger = new Logger(SequenceEventsHandler.name);

  constructor(private readonly sequenceRepo: SequenceRepository) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async onMessageReceived(payload: {
    contactId?: string;
    orgId: string;
    body?: string;
  }) {
    if (!payload.contactId) return;

    try {
      const activeRecipients = await this.sequenceRepo.findActiveRecipientByContact(
        payload.contactId,
        payload.orgId,
      );

      for (const recipient of activeRecipients) {
        const { sequence } = recipient;
        const steps = sequence.steps || [];

        // Get the last sent step (currentStep - 1, since currentStep points to next)
        const lastSentStepOrder = recipient.currentStep - 1;
        const lastSentStep = steps.find((s) => s.stepOrder === lastSentStepOrder);

        // Check conditions on the last sent step
        const conditions = lastSentStep?.conditions as Array<{ keyword: string; goToStepOrder: number }> | null;
        if (conditions?.length && payload.body) {
          const messageLower = payload.body.toLowerCase();
          const match = conditions.find((c) => messageLower.includes(c.keyword.toLowerCase()));

          if (match) {
            // Find the target step to get its delay
            const targetStep = steps.find((s) => s.stepOrder === match.goToStepOrder);
            const delay = targetStep?.delayMinutes ?? 0;

            await this.sequenceRepo.jumpRecipientToStep(recipient.id, match.goToStepOrder, delay);
            this.logger.debug(
              `Contact ${payload.contactId} jumped to step ${match.goToStepOrder} in sequence ${recipient.sequenceId} (keyword: "${match.keyword}")`,
            );
            continue;
          }
        }

        // No condition matched — fall back to exit-on-reply behavior
        if (sequence.exitOnReply) {
          await this.sequenceRepo.exitRecipient(recipient.id, 'Contact replied');
          await this.sequenceRepo.updateSequenceCounters(recipient.sequenceId);
          this.logger.debug(
            `Contact ${payload.contactId} exited sequence ${recipient.sequenceId} (replied)`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process sequence reply for contact ${payload.contactId}: ${error}`);
    }
  }
}
