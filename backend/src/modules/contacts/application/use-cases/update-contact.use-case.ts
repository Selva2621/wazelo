import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { UpdateContactDto } from '../dto/update-contact.dto';
import { EVENT_NAMES } from '@/common/constants';
import { ContactUpdatedEvent } from '@/events/event-bus';

@Injectable()
export class UpdateContactUseCase {
  private readonly logger = new Logger(UpdateContactUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    orgId: string,
    userId: string,
    dto: UpdateContactDto,
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

    // Build changes object for audit trail
    const changes: Record<string, unknown> = {};
    if (dto.name !== undefined && dto.name !== existing.name)
      changes.name = { from: existing.name, to: dto.name };
    if (dto.email !== undefined && dto.email !== existing.email)
      changes.email = { from: existing.email, to: dto.email };
    if (dto.avatarUrl !== undefined && dto.avatarUrl !== existing.avatarUrl)
      changes.avatarUrl = { from: existing.avatarUrl, to: dto.avatarUrl };

    // No actual changes — return existing contact
    if (Object.keys(changes).length === 0) {
      return existing;
    }

    const updated = await this.contactRepository.update(contactId, dto);

    this.logger.log(`Contact updated: ${contactId} by user ${userId}`);

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_UPDATED,
      targetType: 'Contact',
      targetId: contactId,
      metadata: changes,
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_UPDATED, {
      contactId,
      orgId,
      updatedById: userId,
      changes,
    } satisfies ContactUpdatedEvent);

    return updated;
  }
}
