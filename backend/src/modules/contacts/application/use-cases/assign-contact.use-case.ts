import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { UserRepository } from '@/modules/users/infrastructure/repositories/user.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AssignContactDto } from '../dto/assign-contact.dto';
import { EVENT_NAMES } from '@/common/constants';
import {
  ContactAssignedEvent,
  ContactReassignedEvent,
} from '@/events/event-bus';

@Injectable()
export class AssignContactUseCase {
  private readonly logger = new Logger(AssignContactUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly userRepository: UserRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    orgId: string,
    userId: string,
    dto: AssignContactDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    const contact = await this.contactRepository.findByIdAndOrg(
      contactId,
      orgId,
    );

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    // Validate new owner exists and belongs to same org
    const newOwner = await this.userRepository.findByIdAndOrg(
      dto.ownerId,
      orgId,
    );

    if (!newOwner) {
      throw new BadRequestException(
        'Target owner not found in this organization',
      );
    }

    // Idempotent — if already assigned to this owner, return
    if (contact.ownerId === dto.ownerId) {
      return contact;
    }

    const previousOwnerId = contact.ownerId;
    const isReassignment = previousOwnerId !== null;

    const updated = await this.contactRepository.reassignOwner(
      contactId,
      orgId,
      dto.ownerId,
      userId,
      dto.reason,
    );

    const auditAction = isReassignment
      ? AuditAction.CONTACT_REASSIGNED
      : AuditAction.CONTACT_ASSIGNED;

    this.logger.log(
      `Contact ${contactId} ${isReassignment ? 'reassigned' : 'assigned'}: ${previousOwnerId} → ${dto.ownerId}`,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: auditAction,
      targetType: 'Contact',
      targetId: contactId,
      metadata: {
        previousOwnerId,
        newOwnerId: dto.ownerId,
        reason: dto.reason,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    if (isReassignment) {
      this.eventEmitter.emit(EVENT_NAMES.CONTACT_REASSIGNED, {
        contactId,
        orgId,
        previousOwnerId,
        newOwnerId: dto.ownerId,
        reassignedById: userId,
      } satisfies ContactReassignedEvent);
    } else {
      this.eventEmitter.emit(EVENT_NAMES.CONTACT_ASSIGNED, {
        contactId,
        orgId,
        ownerId: dto.ownerId,
        assignedById: userId,
      } satisfies ContactAssignedEvent);
    }

    return updated;
  }
}
