import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { ContactSource, SequenceTriggerType } from '@prisma/client';
import { EVENT_NAMES } from '@/common/constants';
import { SequenceRepository } from '@/modules/sequences/infrastructure/repositories/sequence.repository';
import { EnrollContactUseCase } from '@/modules/sequences/application/use-cases/enroll-contact.use-case';
import { ChatbotRepository } from '@/modules/chatbot/infrastructure/repositories/chatbot.repository';
import type {
  ContactAutoCreatedEvent,
  ContactCreatedEvent,
  ContactStatusChangedEvent,
  DealStageChangedEvent,
} from '../event-bus';

/**
 * Always-on sequences: when a deal reaches a stage, a lead changes status or a
 * contact is created, add that contact to every active sequence waiting for it.
 */
@Injectable()
export class SequenceTriggerHandler {
  private readonly logger = new Logger(SequenceTriggerHandler.name);

  constructor(
    private readonly sequenceRepo: SequenceRepository,
    private readonly enrollContact: EnrollContactUseCase,
    private readonly chatbotRepo: ChatbotRepository,
  ) {}

  @OnEvent(EVENT_NAMES.DEAL_STAGE_CHANGED)
  async onDealStageChanged(payload: DealStageChangedEvent) {
    await this.enrollMatching(payload.orgId, payload.contactId, SequenceTriggerType.DEAL_STAGE_CHANGED, (config) =>
      config.stageId === payload.stageId,
    );
  }

  @OnEvent(EVENT_NAMES.CONTACT_STATUS_CHANGED)
  async onLeadStatusChanged(payload: ContactStatusChangedEvent) {
    await this.enrollMatching(payload.orgId, payload.contactId, SequenceTriggerType.LEAD_STATUS_CHANGED, (config) =>
      config.toStatus === payload.newStatus,
    );
  }

  @OnEvent(EVENT_NAMES.CONTACT_CREATED)
  async onContactCreated(payload: ContactCreatedEvent) {
    // Scraped leads are cold — they get outreach from the lead scraper, not a welcome
    if (payload.source === ContactSource.WEB_SCRAPE) return;
    await this.enrollMatching(payload.orgId, payload.contactId, SequenceTriggerType.CONTACT_CREATED, () => true);
  }

  /**
   * A stranger messaged us first and became a contact. One welcome only: when a
   * chatbot greets new chats, it answers them, so "contact created" sequences skip them
   * (they still run for contacts added or imported by the team).
   */
  @OnEvent(EVENT_NAMES.CONTACT_AUTO_CREATED)
  async onContactAutoCreated(payload: ContactAutoCreatedEvent) {
    if (await this.chatbotRepo.hasGreetingFlow(payload.orgId).catch(() => false)) {
      this.logger.debug(`Contact ${payload.contactId} wrote first and the chatbot greets them — no welcome sequence`);
      return;
    }
    await this.enrollMatching(payload.orgId, payload.contactId, SequenceTriggerType.CONTACT_CREATED, () => true);
  }

  private async enrollMatching(
    orgId: string,
    contactId: string,
    triggerType: SequenceTriggerType,
    matches: (config: Record<string, unknown>) => boolean,
  ) {
    try {
      const sequences = await this.sequenceRepo.findActiveTriggered(orgId, triggerType);
      for (const seq of sequences) {
        if (!matches((seq.triggerConfig ?? {}) as Record<string, unknown>)) continue;
        const result = await this.enrollContact.execute(orgId, seq.id, contactId);
        if (!result.enrolled) {
          this.logger.debug(`Contact ${contactId} not enrolled in sequence ${seq.id}: ${result.reason}`);
        }
      }
    } catch (error) {
      this.logger.error(`Sequence trigger ${triggerType} failed for contact ${contactId}: ${error}`);
    }
  }
}
