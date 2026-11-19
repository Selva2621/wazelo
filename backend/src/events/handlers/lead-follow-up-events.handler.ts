import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import type { ContactStatusChangedEvent, LeadProductInterestEvent } from '@/events/event-bus';
import { AssignLeadUseCase, TouchLeadUseCase } from '@/modules/lead-follow-ups/application/use-cases/lead-follow-up.use-cases';

/**
 * Lead routing: a lead for a product goes to that product's team, and the lead
 * counts as contacted once someone messages it by hand or changes its status
 * (the automatic welcome doesn't count).
 */
@Injectable()
export class LeadFollowUpEventsHandler {
  private readonly logger = new Logger(LeadFollowUpEventsHandler.name);

  constructor(
    private readonly assignLead: AssignLeadUseCase,
    private readonly touchLead: TouchLeadUseCase,
  ) {}

  @OnEvent(EVENT_NAMES.LEAD_PRODUCT_INTEREST, { async: true })
  async onLeadInterest(event: LeadProductInterestEvent): Promise<void> {
    try {
      await this.assignLead.execute(event);
    } catch (error) {
      this.logger.error(`Assigning lead for contact ${event.contactId} failed: ${(error as Error).message}`);
    }
  }

  /** A person replied in the chat (sent from the inbox; automations and the bot don't emit this) */
  @OnEvent(EVENT_NAMES.CONVERSATION_AGENT_REPLIED, { async: true })
  async onAgentReplied(event: { orgId: string; conversationId: string; userId?: string | null }): Promise<void> {
    if (!event.userId || !event.conversationId) return;
    try {
      await this.touchLead.byConversation(event.orgId, event.conversationId, event.userId);
    } catch (error) {
      this.logger.error(`Marking lead contacted (message) failed: ${(error as Error).message}`);
    }
  }

  @OnEvent(EVENT_NAMES.CONTACT_STATUS_CHANGED, { async: true })
  async onStatusChanged(event: ContactStatusChangedEvent): Promise<void> {
    if (!event.changedById) return;
    try {
      await this.touchLead.byContact(event.orgId, event.contactId, event.changedById, 'STATUS');
    } catch (error) {
      this.logger.error(`Marking lead contacted (status) failed: ${(error as Error).message}`);
    }
  }
}
