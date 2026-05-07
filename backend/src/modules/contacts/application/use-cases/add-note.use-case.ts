import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AddNoteDto } from '../dto/add-note.dto';
import { EVENT_NAMES } from '@/common/constants';
import { ContactNoteAddedEvent } from '@/events/event-bus';

@Injectable()
export class AddNoteUseCase {
  private readonly logger = new Logger(AddNoteUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    orgId: string,
    userId: string,
    dto: AddNoteDto,
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

    const note = await this.contactRepository.createNote(
      contactId,
      orgId,
      userId,
      dto.content,
    );

    this.logger.log(
      `Note added to contact ${contactId} by user ${userId}`,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_NOTE_ADDED,
      targetType: 'ContactNote',
      targetId: note.id,
      metadata: { contactId },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_NOTE_ADDED, {
      noteId: note.id,
      contactId,
      orgId,
      authorId: userId,
    } satisfies ContactNoteAddedEvent);

    return note;
  }
}
