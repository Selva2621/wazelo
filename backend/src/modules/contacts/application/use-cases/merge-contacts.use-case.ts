import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { MergeContactsDto } from '../dto/merge-contacts.dto';
import { EVENT_NAMES } from '@/common/constants';
import { ContactMergedEvent } from '@/events/event-bus';

@Injectable()
export class MergeContactsUseCase {
  private readonly logger = new Logger(MergeContactsUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: MergeContactsDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    if (dto.primaryContactId === dto.secondaryContactId) {
      throw new BadRequestException('Cannot merge a contact with itself');
    }

    // Validate both contacts exist and belong to the org
    const [primary, secondary] = await Promise.all([
      this.contactRepository.findByIdAndOrg(dto.primaryContactId, orgId),
      this.contactRepository.findByIdAndOrg(dto.secondaryContactId, orgId),
    ]);

    if (!primary) {
      throw new NotFoundException('Primary contact not found');
    }
    if (!secondary) {
      throw new NotFoundException('Secondary contact not found');
    }

    // Cannot merge an already-merged contact
    if (primary.mergedIntoId) {
      throw new BadRequestException(
        'Primary contact has already been merged into another contact',
      );
    }
    if (secondary.mergedIntoId) {
      throw new BadRequestException(
        'Secondary contact has already been merged into another contact',
      );
    }

    const merged = await this.contactRepository.mergeContacts(
      dto.primaryContactId,
      dto.secondaryContactId,
      orgId,
      userId,
    );

    this.logger.log(
      `Contacts merged: ${dto.secondaryContactId} → ${dto.primaryContactId} by ${userId}`,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_MERGED,
      targetType: 'Contact',
      targetId: dto.primaryContactId,
      metadata: {
        primaryContactId: dto.primaryContactId,
        secondaryContactId: dto.secondaryContactId,
        primaryPhone: primary.phoneNumber,
        secondaryPhone: secondary.phoneNumber,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_MERGED, {
      primaryContactId: dto.primaryContactId,
      mergedContactId: dto.secondaryContactId,
      orgId,
      mergedById: userId,
    } satisfies ContactMergedEvent);

    return merged;
  }
}
