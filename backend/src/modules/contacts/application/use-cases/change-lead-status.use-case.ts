import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { ChangeLeadStatusDto } from '../dto/change-lead-status.dto';
import { EVENT_NAMES } from '@/common/constants';
import { ContactStatusChangedEvent } from '@/events/event-bus';

@Injectable()
export class ChangeLeadStatusUseCase {
  private readonly logger = new Logger(ChangeLeadStatusUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    orgId: string,
    userId: string,
    dto: ChangeLeadStatusDto,
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

    // Idempotent — if status is the same, return current contact
    if (existing.leadStatus === dto.status) {
      return existing;
    }

    const previousStatus = existing.leadStatus;

    const updated = await this.contactRepository.updateLeadStatus(
      contactId,
      orgId,
      dto.status,
      userId,
      dto.reason,
    );

    this.logger.log(
      `Lead status changed: ${contactId} ${previousStatus} → ${dto.status}`,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_STATUS_CHANGED,
      targetType: 'Contact',
      targetId: contactId,
      metadata: {
        previousStatus,
        newStatus: dto.status,
        reason: dto.reason,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_STATUS_CHANGED, {
      contactId,
      orgId,
      previousStatus,
      newStatus: dto.status,
      changedById: userId,
    } satisfies ContactStatusChangedEvent);

    return updated;
  }
}
