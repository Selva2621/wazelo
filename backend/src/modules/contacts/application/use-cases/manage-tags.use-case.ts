import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditAction } from '@prisma/client';
import { ContactRepository } from '../../infrastructure/repositories/contact.repository';
import { AuditService } from '@/modules/audit/domain/services/audit.service';
import { AddTagDto } from '../dto/manage-tag.dto';
import { EVENT_NAMES } from '@/common/constants';
import {
  ContactTagAddedEvent,
  ContactTagRemovedEvent,
} from '@/events/event-bus';

@Injectable()
export class AddTagUseCase {
  private readonly logger = new Logger(AddTagUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    orgId: string,
    userId: string,
    dto: AddTagDto,
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

    // Find or create the tag at the org level
    const tag = await this.contactRepository.findOrCreateTag(
      orgId,
      dto.name,
      dto.color,
    );

    // Link tag to contact (idempotent via upsert)
    await this.contactRepository.addTagToContact(
      contactId,
      tag.id,
      orgId,
      userId,
    );

    this.logger.log(
      `Tag "${tag.name}" added to contact ${contactId}`,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_TAG_ADDED,
      targetType: 'ContactTag',
      targetId: contactId,
      metadata: { tagId: tag.id, tagName: tag.name },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_TAG_ADDED, {
      contactId,
      tagId: tag.id,
      tagName: tag.name,
      orgId,
      addedById: userId,
    } satisfies ContactTagAddedEvent);

    return tag;
  }
}

@Injectable()
export class RemoveTagUseCase {
  private readonly logger = new Logger(RemoveTagUseCase.name);

  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly auditService: AuditService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    contactId: string,
    tagId: string,
    orgId: string,
    userId: string,
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

    // Get tag name for audit/event before removing
    const tags = await this.contactRepository.getContactTags(contactId);
    const tagEntry = tags.find((t) => t.tagId === tagId);

    if (!tagEntry) {
      // Tag not assigned — idempotent, just return
      return { success: true };
    }

    await this.contactRepository.removeTagFromContact(contactId, tagId);

    this.logger.log(
      `Tag "${tagEntry.tag.name}" removed from contact ${contactId}`,
    );

    await this.auditService.log({
      orgId,
      userId,
      action: AuditAction.CONTACT_TAG_REMOVED,
      targetType: 'ContactTag',
      targetId: contactId,
      metadata: { tagId, tagName: tagEntry.tag.name },
      ipAddress,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });

    this.eventEmitter.emit(EVENT_NAMES.CONTACT_TAG_REMOVED, {
      contactId,
      tagId,
      tagName: tagEntry.tag.name,
      orgId,
      removedById: userId,
    } satisfies ContactTagRemovedEvent);

    return { success: true };
  }
}
