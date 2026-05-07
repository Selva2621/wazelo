import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { EVENT_NAMES } from '@/common/constants';
import { ContactDeletedEvent } from '@/events/event-bus';

@Injectable()
export class DeleteContactUseCase {
  private readonly logger = new Logger(DeleteContactUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    orgId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const existing = await this.contactRepository.findByIdAndOrg(
      contactId,
      orgId,
    );

    if (!existing) {
      throw new NotFoundException('Contact not found');
    }

    await this.contactRepository.softDelete(contactId);

    this.logger.log(`Contact soft-deleted: ${contactId} by user ${userId}`);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_DELETED,
      targetType: 'Contact',
      targetId: contactId,
      metadata: { phoneNumber: existing.phoneNumber },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_DELETED, {
      contactId,
      orgId,
      deletedById: userId,
    } satisfies ContactDeletedEvent);

    return { success: true };
  }
}
