import { Injectable, Logger } from '@nestjs/common';
import { SequenceRecipientStatus, SequenceStatus } from '@prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { QUEUE_NAMES } from '@/common/constants';
import { SequenceRepository } from '../../infrastructure/repositories/sequence.repository';

export type EnrollResult =
  | { enrolled: true; recipientId: string }
  | { enrolled: false; reason: 'SEQUENCE_NOT_ACTIVE' | 'CONTACT_NOT_FOUND' | 'OPTED_OUT' | 'ALREADY_ACTIVE' };

/**
 * Add one contact to a running sequence. Shared by always-on sequence triggers
 * and the automation "Add to sequence" action.
 */
@Injectable()
export class EnrollContactUseCase {
  private readonly logger = new Logger(EnrollContactUseCase.name);

  constructor(
    private readonly repo: SequenceRepository,
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async execute(orgId: string, sequenceId: string, contactId: string): Promise<EnrollResult> {
    const sequence = await this.repo.findActiveForEnroll(sequenceId, orgId);
    // A paused sequence still takes contacts; they wait until it resumes
    if (!sequence?.steps.length || (sequence.status !== SequenceStatus.ACTIVE && sequence.status !== SequenceStatus.PAUSED)) {
      return { enrolled: false, reason: 'SEQUENCE_NOT_ACTIVE' };
    }

    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, orgId, deletedAt: null },
      select: { phoneNumber: true, optedOut: true },
    });
    if (!contact) return { enrolled: false, reason: 'CONTACT_NOT_FOUND' };
    if (contact.optedOut) return { enrolled: false, reason: 'OPTED_OUT' };

    // Someone mid-sequence keeps their place rather than starting over
    const existing = await this.repo.findRecipient(sequenceId, contactId);
    if (existing?.status === SequenceRecipientStatus.ACTIVE || existing?.status === SequenceRecipientStatus.PAUSED) {
      return { enrolled: false, reason: 'ALREADY_ACTIVE' };
    }

    const recipient = await this.repo.enrollOne({
      sequenceId,
      orgId,
      contactId,
      contactPhone: contact.phoneNumber,
      nextStepAt: new Date(Date.now() + (sequence.steps[0].delayMinutes ?? 0) * 60 * 1000),
      replaceRecipientId: existing?.id,
    });
    await this.repo.updateSequenceCounters(sequenceId);

    // Send a first step that is due now without waiting for the next periodic check
    await this.queueService.publishOnce(QUEUE_NAMES.SEQUENCE_STEP_CHECK, { sequenceId, orgId }, `seq-check-${recipient.id}`);

    this.logger.debug(`Contact ${contactId} enrolled in sequence ${sequenceId}`);
    return { enrolled: true, recipientId: recipient.id };
  }
}
