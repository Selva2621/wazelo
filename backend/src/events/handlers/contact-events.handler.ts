import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { AutoCreateContactUseCase } from '@/modules/contacts/application/use-cases/auto-create-contact.use-case';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import {
  WhatsAppMessageReceivedEvent,
  ContactCreatedEvent,
  ContactAutoCreatedEvent,
  ContactUpdatedEvent,
  ContactDeletedEvent,
  ContactMergedEvent,
  ContactAssignedEvent,
  ContactReassignedEvent,
  ContactStatusChangedEvent,
  ContactNoteAddedEvent,
  ContactTagAddedEvent,
  ContactTagRemovedEvent,
} from '../event-bus';

@Injectable()
export class ContactEventsHandler {
  private readonly logger = new Logger(ContactEventsHandler.name);

  constructor(
    private readonly autoCreateContactUseCase: AutoCreateContactUseCase,
    private readonly wsGateway: AppWebSocketGateway,
  ) {}

  // ─────────────────────────────────────────────
  // Auto-create contact from inbound WhatsApp message
  // This is the bridge between EPIC 3 (messages) and EPIC 4 (contacts).
  // ─────────────────────────────────────────────

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED, { async: true })
  async handleInboundMessage(event: WhatsAppMessageReceivedEvent): Promise<void> {
    try {
      this.logger.debug(
        `Processing inbound message for auto-contact creation: ${event.contactPhone}`,
      );

      // We need the session's userId (owner) to assign the contact.
      // The event includes sessionId and orgId — the AutoCreateContactUseCase
      // handles the upsert with race-condition safety.
      await this.autoCreateContactUseCase.execute({
        orgId: event.orgId,
        phoneNumber: event.contactPhone,
        ownerId: event.userId,
        sessionId: event.sessionId,
        messageId: event.messageId,
      });
    } catch (error) {
      // Auto-creation failure must never block message processing
      this.logger.error(
        `Failed to auto-create contact for phone ${event.contactPhone}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  // ─────────────────────────────────────────────
  // WebSocket broadcasts for real-time UI updates
  // ─────────────────────────────────────────────

  @OnEvent(EVENT_NAMES.CONTACT_CREATED)
  handleContactCreated(event: ContactCreatedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:created', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_AUTO_CREATED)
  handleContactAutoCreated(event: ContactAutoCreatedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:created', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_UPDATED)
  handleContactUpdated(event: ContactUpdatedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:updated', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_DELETED)
  handleContactDeleted(event: ContactDeletedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:deleted', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_MERGED)
  handleContactMerged(event: ContactMergedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:merged', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_ASSIGNED)
  handleContactAssigned(event: ContactAssignedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:assigned', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_REASSIGNED)
  handleContactReassigned(event: ContactReassignedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:reassigned', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_STATUS_CHANGED)
  handleContactStatusChanged(event: ContactStatusChangedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:status_changed', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_NOTE_ADDED)
  handleContactNoteAdded(event: ContactNoteAddedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:note_added', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_TAG_ADDED)
  handleContactTagAdded(event: ContactTagAddedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:tag_added', event);
  }

  @OnEvent(EVENT_NAMES.CONTACT_TAG_REMOVED)
  handleContactTagRemoved(event: ContactTagRemovedEvent): void {
    this.wsGateway.emitToOrg(event.orgId, 'contact:tag_removed', event);
  }
}
