import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { PrismaService } from '@/infrastructure/database/prisma.service';
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

  constructor(
    private readonly sequenceRepo: SequenceRepository,
    private readonly prisma: PrismaService,
  ) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async onMessageReceived(payload: {
    contactId?: string;
    contactPhone?: string;
    messageId?: string;
    orgId: string;
    body?: string;
  }) {
    try {
      // Inbound WhatsApp events carry the phone and message id, not the contact or text
      const contactId = payload.contactId ?? (await this.findContactId(payload.orgId, payload.contactPhone));
      if (!contactId) return;
      const message = payload.messageId
        ? await this.prisma.message.findUnique({ where: { id: payload.messageId }, select: { body: true, createdAt: true } })
        : null;
      const body = payload.body ?? message?.body ?? undefined;

      const activeRecipients = await this.sequenceRepo.findActiveRecipientByContact(contactId, payload.orgId);

      for (const recipient of activeRecipients) {
        // The message that got them enrolled (e.g. a first message) is not a reply
        if (message && message.createdAt <= recipient.enrolledAt) continue;

        const { sequence } = recipient;
        const steps = sequence.steps || [];

        // Get the last sent step (currentStep - 1, since currentStep points to next)
        const lastSentStepOrder = recipient.currentStep - 1;
        const lastSentStep = steps.find((s) => s.stepOrder === lastSentStepOrder);

        // Check conditions on the last sent step
        const conditions = lastSentStep?.conditions as Array<{ keyword: string; goToStepOrder: number }> | null;
        if (conditions?.length && body) {
          const messageLower = body.toLowerCase();
          const match = conditions.find((c) => messageLower.includes(c.keyword.toLowerCase()));

          if (match) {
            // Find the target step to get its delay
            const targetStep = steps.find((s) => s.stepOrder === match.goToStepOrder);
            const delay = targetStep?.delayMinutes ?? 0;

            await this.sequenceRepo.jumpRecipientToStep(recipient.id, match.goToStepOrder, delay);
            this.logger.debug(
              `Contact ${contactId} jumped to step ${match.goToStepOrder} in sequence ${recipient.sequenceId} (keyword: "${match.keyword}")`,
            );
            continue;
          }
        }

        // No condition matched — fall back to exit-on-reply behavior
        if (sequence.exitOnReply) {
          await this.sequenceRepo.exitRecipient(recipient.id, 'Contact replied');
          await this.sequenceRepo.updateSequenceCounters(recipient.sequenceId);
          this.logger.debug(
            `Contact ${contactId} exited sequence ${recipient.sequenceId} (replied)`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to process sequence reply from ${payload.contactId ?? payload.contactPhone}: ${error}`);
    }
  }

  private async findContactId(orgId: string, phone?: string): Promise<string | undefined> {
    if (!phone) return undefined;
    const digits = phone.replace(/^\+/, '');
    const contact = await this.prisma.contact.findFirst({
      where: { orgId, deletedAt: null, phoneNumber: { in: [digits, `+${digits}`] } },
      select: { id: true },
    });
    return contact?.id;
  }
}
