import {
  Injectable,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ContactSource, AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { CreateContactDto } from '../dto/create-contact.dto';
import { EVENT_NAMES } from '@/common/constants';
import { ContactCreatedEvent } from '@/events/event-bus';

@Injectable()
export class CreateContactUseCase {
  private readonly logger = new Logger(CreateContactUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    orgId: string,
    userId: string,
    dto: CreateContactDto,
    ipAddress?: string,
    userAgent?: string | string[],
  ) {
    // Check for existing contact with same phone in the org
    const existing = await this.contactRepository.findByPhoneAndOrg(
      dto.phoneNumber,
      orgId,
    );

    if (existing) {
      throw new ConflictException(
        `Contact with phone number ${dto.phoneNumber} already exists`,
      );
    }

    const ownerId = dto.ownerId ?? userId;

    const contact = await this.contactRepository.createWithHistory(
      {
        orgId,
        phoneNumber: dto.phoneNumber,
        name: dto.name,
        email: dto.email,
        source: dto.source ?? ContactSource.MANUAL,
        ownerId,
      },
      userId,
    );

    this.logger.log(
      `Contact created: ${contact.id} (org: ${orgId}, phone: ${dto.phoneNumber})`,
    );

    // Audit log
    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_CREATED,
      targetType: 'Contact',
      targetId: contact.id,
      metadata: {
        phoneNumber: dto.phoneNumber,
        source: dto.source ?? ContactSource.MANUAL,
        ownerId,
      },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    // Emit event
    this.eventEmitter.emit(EVENT_NAMES.CONTACT_CREATED, {
      contactId: contact.id,
      orgId,
      phoneNumber: dto.phoneNumber,
      ownerId,
      source: dto.source ?? ContactSource.MANUAL,
      createdById: userId,
    } satisfies ContactCreatedEvent);

    return contact;
  }
}
