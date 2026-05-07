import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { LeadScoringService } from '@/modules/lead-scoring/domain/services/lead-scoring.service';
import { LeadScoringRepository } from '@/modules/lead-scoring/infrastructure/repositories/lead-scoring.repository';

/**
 * Listens to domain events and triggers lead score recalculation.
 */
@Injectable()
export class LeadScoringEventsHandler {
  private readonly logger = new Logger(LeadScoringEventsHandler.name);

  constructor(
    private readonly scoringService: LeadScoringService,
    private readonly scoringRepo: LeadScoringRepository,
  ) {}

  @OnEvent(EVENT_NAMES.CONTACT_CREATED)
  async onContactCreated(payload: {
    contactId: string;
    orgId: string;
    source: string;
  }) {
    await this.applySignal(payload.contactId, payload.orgId, 'contact_created', {
      source: payload.source,
    });
  }

  @OnEvent(EVENT_NAMES.CONTACT_STATUS_CHANGED)
  async onStatusChanged(payload: {
    contactId: string;
    orgId: string;
    previousStatus: string;
    newStatus: string;
  }) {
    await this.applySignal(payload.contactId, payload.orgId, 'status_changed', {
      fromStatus: payload.previousStatus,
      toStatus: payload.newStatus,
    });
  }

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async onMessageReceived(payload: {
    contactPhone: string;
    sessionId: string;
    orgId: string;
    contactId?: string;
  }) {
    if (!payload.contactId) return;
    await this.applySignal(payload.contactId, payload.orgId, 'message_received', {});
  }

  @OnEvent(EVENT_NAMES.CONTACT_NOTE_ADDED)
  async onNoteAdded(payload: { contactId: string; orgId: string }) {
    await this.applySignal(payload.contactId, payload.orgId, 'note_added', {});
  }

  @OnEvent(EVENT_NAMES.CONTACT_TAG_ADDED)
  async onTagAdded(payload: { contactId: string; orgId: string; tagName?: string }) {
    await this.applySignal(payload.contactId, payload.orgId, 'tag_added', {
      tagName: payload.tagName,
    });
  }

  private async applySignal(
    contactId: string,
    orgId: string,
    signal: string,
    context: Record<string, unknown>,
  ) {
    try {
      const contact = await this.scoringRepo.getContactScore(contactId, orgId);
      if (!contact) return;

      const result = await this.scoringService.processSignal({
        contactId,
        orgId,
        currentScore: contact.leadScore,
        signal,
        context,
      });

      if (result.applied > 0) {
        this.logger.debug(
          `Lead score updated for ${contactId}: ${contact.leadScore} → ${result.newScore} (${result.applied} rules)`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process lead scoring signal "${signal}" for contact ${contactId}: ${error}`,
      );
    }
  }
}
