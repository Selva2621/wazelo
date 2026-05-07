import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource, AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { ContactAutoCreatedEvent } from '@/events/event-bus';

export interface AutoCreateContactInput {
  orgId: string;
  phoneNumber: string;
  contactName?: string;
  ownerId: string;   // session owner (employee)
  sessionId: string;  // WhatsApp session that received the message
  messageId: string;  // triggering message
}

@Injectable()
export class AutoCreateContactUseCase {
  private readonly logger = new Logger(AutoCreateContactUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Called when an inbound WhatsApp message is received.
   * Uses upsertByPhone for race-condition-safe deduplication:
   * - If the phone number is new → creates a Contact
   * - If the phone number exists → returns existing contact (no-op)
   *
   * Performance target: ≤2s from message receipt (AC1).
   */
  async execute(input: AutoCreateContactInput): Promise<{
    contactId: string;
    created: boolean;
  }> {
    const { contact, created } = await this.contactRepository.upsertByPhone(
      {
        orgId: input.orgId,
        phoneNumber: input.phoneNumber,
        name: input.contactName,
        source: ContactSource.WHATSAPP,
        ownerId: input.ownerId,
        sessionId: input.sessionId,
      },
      input.ownerId, // createdById = session owner
    );

    if (created) {
      this.logger.log(
        `Auto-created contact ${contact.id} from message ${input.messageId} (phone: ${input.phoneNumber})`,
      );

      // Audit — fire-and-forget (must never block message processing)
      this.auditService.log({
        orgId: input.orgId,
        userId: input.ownerId,
        action: AuditAction.CONTACT_AUTO_CREATED,
        targetType: 'Contact',
        targetId: contact.id,
        metadata: {
          phoneNumber: input.phoneNumber,
          sessionId: input.sessionId,
          messageId: input.messageId,
          source: ContactSource.WHATSAPP,
        },
      });

      // Emit event for WebSocket broadcast
      this.eventEmitter.emit(EVENT_NAMES.CONTACT_AUTO_CREATED, {
        contactId: contact.id,
        orgId: input.orgId,
        phoneNumber: input.phoneNumber,
        ownerId: input.ownerId,
        sessionId: input.sessionId,
        messageId: input.messageId,
      } satisfies ContactAutoCreatedEvent);
    } else {
      this.logger.debug(
        `Contact already exists for phone ${input.phoneNumber} in org ${input.orgId}`,
      );

      // Update contact name from WhatsApp profile if currently empty
      if (input.contactName && !contact.name) {
        await this.contactRepository.update(contact.id, {
          name: input.contactName,
        });
      }
    }

    return { contactId: contact.id, created };
  }
}
