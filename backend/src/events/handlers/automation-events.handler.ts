import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { AutomationTriggerType, AutomationActionType } from '@prisma/client';
import { AutomationRepository } from '@/modules/automation/infrastructure/repositories/automation.repository';
import { TriggerMatcherService } from '@/modules/automation/domain/services/trigger-matcher.service';
import { AppWebSocketGateway } from '@/infrastructure/websocket/websocket.gateway';
import { EvaluateTriggerUseCase } from '@/modules/automation/application/use-cases/evaluate-trigger.use-case';
import { ScheduleNoReplyChecksUseCase } from '@/modules/automation/application/use-cases/no-reply.use-cases';
import { EVENT_NAMES } from '@/common/constants';
import { ChatbotRepository } from '@/modules/chatbot/infrastructure/repositories/chatbot.repository';
import {
  ContactCreatedEvent,
  ContactAutoCreatedEvent,
  ContactStatusChangedEvent,
  DealStageChangedEvent,
  AutomationExecutedEvent,
  AutomationFailedEvent,
  ScheduledMessageExecutedEvent,
  ScheduledMessageFailedEvent,
  AutomationRuleCreatedEvent,
  AutomationRuleEnabledEvent,
  AutomationRuleDisabledEvent,
  AutomationRuleDeletedEvent,
  FollowUpCancelledEvent,
  FollowUpExecutedEvent,
  WidgetMessageReceivedAutomationEvent,
  WhatsAppMessageSentEvent,
  LeadAdReceivedEvent,
} from '../event-bus';

const NO_LEAD_WELCOME = { welcomeByLeadAdRule: false, emailByLeadAdRule: false };

/**
 * Message variables for a lead: {{lead.campaign}}, {{lead.ad}}, {{lead.form}}, {{lead.platform}}
 * and one per form answer, keyed by the question's slug — "What's your city?" → {{lead.what_s_your_city}}
 */
export function buildLeadVars(payload: Pick<LeadAdReceivedEvent, 'leadData' | 'campaignName' | 'adName' | 'formId' | 'platform'>): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(payload.leadData ?? {})) {
    const slug = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
    if (slug && value != null && value !== '') vars[slug] = String(value);
  }
  if (payload.campaignName) vars.campaign = payload.campaignName;
  if (payload.adName) vars.ad = payload.adName;
  if (payload.formId) vars.form = payload.formId;
  if (payload.platform) vars.platform = payload.platform;
  return vars;
}

@Injectable()
export class AutomationEventsHandler {
  private readonly logger = new Logger(AutomationEventsHandler.name);

  constructor(
    private readonly evaluateTrigger: EvaluateTriggerUseCase,
    private readonly wsGateway: AppWebSocketGateway,
    private readonly scheduleNoReplyChecks: ScheduleNoReplyChecksUseCase,
    private readonly chatbotRepo: ChatbotRepository,
    private readonly automationRepo: AutomationRepository,
    private readonly triggerMatcher: TriggerMatcherService,
  ) {}

  // ─── Trigger Evaluation Handlers ──────────────────
  // NOTE: WHATSAPP_MESSAGE_RECEIVED is handled by MessagePipelineHandler
  // (chatbot-first, then automation) to prevent race conditions.

  @OnEvent(EVENT_NAMES.CONTACT_CREATED)
  async handleContactCreated(
    payload: ContactCreatedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Evaluating automation triggers for contact creation: ${payload.contactId}`,
    );

    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.CONTACT_CREATED,
        eventPayload: {
          contactId: payload.contactId,
          phoneNumber: payload.phoneNumber,
          source: payload.source,
          ownerId: payload.ownerId,
          // One welcome per channel: a "Lead ad received" rule that messages / emails this
          // lead wins, so this rule's matching send steps skip (tags, assignment etc. still run)
          ...(payload.leadAd &&
            (await this.leadAdRuleWelcomes(payload.orgId, payload.leadAd).catch(() => NO_LEAD_WELCOME))),
        },
        context: {
          contact: {
            id: payload.contactId,
            phoneNumber: payload.phoneNumber,
            source: payload.source,
            ownerId: payload.ownerId,
          },
        },
        contactId: payload.contactId,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating CONTACT_CREATED trigger: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.CONTACT_AUTO_CREATED)
  async handleContactAutoCreated(
    payload: ContactAutoCreatedEvent,
  ): Promise<void> {
    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.CONTACT_CREATED,
        eventPayload: {
          contactId: payload.contactId,
          phoneNumber: payload.phoneNumber,
          source: 'WHATSAPP',
          ownerId: payload.ownerId,
          auto: true,
          // One welcome only: the chatbot greets people who write first, so the
          // rule's "send message" steps skip (tags, assignment etc. still run)
          welcomeByChatbot: await this.chatbotRepo.hasGreetingFlow(payload.orgId).catch(() => false),
        },
        context: {
          contact: {
            id: payload.contactId,
            phoneNumber: payload.phoneNumber,
            source: 'WHATSAPP',
            ownerId: payload.ownerId,
          },
        },
        contactId: payload.contactId,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating CONTACT_AUTO_CREATED trigger: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /** Which channels an active "Lead ad received" rule already welcomes this (new) lead on */
  private async leadAdRuleWelcomes(
    orgId: string,
    leadAd: { platform: string; pageId?: string; formId: string | null },
  ): Promise<typeof NO_LEAD_WELCOME> {
    const rules = await this.automationRepo.findActiveRulesByTriggerType(orgId, AutomationTriggerType.LEAD_AD_RECEIVED);
    const matching = rules.filter((rule) =>
      this.triggerMatcher.matches({
        triggerType: AutomationTriggerType.LEAD_AD_RECEIVED,
        triggerConfig: (rule.triggerConfig ?? {}) as Record<string, unknown>,
        eventPayload: { platform: leadAd.platform, pageId: leadAd.pageId, formId: leadAd.formId, isNewContact: true },
      }),
    );
    const sends = (type: AutomationActionType) => matching.some((r) => r.actions.some((a) => a.actionType === type));
    return {
      welcomeByLeadAdRule: sends(AutomationActionType.SEND_MESSAGE),
      emailByLeadAdRule: sends(AutomationActionType.SEND_EMAIL),
    };
  }

  /** Every lead form submission — new or repeat contact — is its own LEAD_AD_RECEIVED event */
  @OnEvent(EVENT_NAMES.LEAD_AD_RECEIVED)
  async handleLeadAdReceived(payload: LeadAdReceivedEvent): Promise<void> {
    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.LEAD_AD_RECEIVED,
        // No contactId here: the dedupe key prefers it over eventId, and a repeat lead is a new event
        eventPayload: {
          eventId: payload.leadgenId,
          leadgenId: payload.leadgenId,
          platform: payload.platform,
          pageId: payload.pageId,
          formId: payload.formId,
          isNewContact: payload.isNewContact,
          leadVars: buildLeadVars(payload),
        },
        context: {
          contact: { id: payload.contactId, phoneNumber: payload.contactPhone },
          trigger: {
            platform: payload.platform,
            formId: payload.formId,
            campaignName: payload.campaignName,
            adName: payload.adName,
            isNewContact: payload.isNewContact,
          },
        },
        contactId: payload.contactId,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating LEAD_AD_RECEIVED trigger: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.CONTACT_STATUS_CHANGED)
  async handleContactStatusChanged(
    payload: ContactStatusChangedEvent,
  ): Promise<void> {
    this.logger.debug(
      `Evaluating automation triggers for status change: ${payload.contactId} ${payload.previousStatus} → ${payload.newStatus}`,
    );

    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.LEAD_STATUS_CHANGED,
        eventPayload: {
          contactId: payload.contactId,
          previousStatus: payload.previousStatus,
          newStatus: payload.newStatus,
          changedById: payload.changedById,
        },
        context: {
          contact: {
            id: payload.contactId,
            leadStatus: payload.newStatus,
            previousLeadStatus: payload.previousStatus,
          },
        },
        contactId: payload.contactId,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating LEAD_STATUS_CHANGED trigger: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  /** Every message we send may start a NO_REPLY countdown for the contact */
  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_SENT)
  async handleMessageSent(payload: WhatsAppMessageSentEvent): Promise<void> {
    try {
      await this.scheduleNoReplyChecks.execute(payload.orgId, payload.messageId);
    } catch (error) {
      this.logger.error(
        `Error scheduling no-reply checks for message ${payload.messageId}: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.DEAL_STAGE_CHANGED)
  async handleDealStageChanged(payload: DealStageChangedEvent): Promise<void> {
    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.DEAL_STAGE_CHANGED,
        // No contactId here: the dedupe key prefers it over eventId, and each move is its own event
        eventPayload: {
          eventId: `${payload.dealId}:${payload.stageId}:${Date.now()}`,
          dealId: payload.dealId,
          pipelineId: payload.pipelineId,
          stageId: payload.stageId,
          previousStageId: payload.previousStageId,
        },
        context: {
          contact: { id: payload.contactId },
          trigger: { dealId: payload.dealId, stageId: payload.stageId, pipelineId: payload.pipelineId },
        },
        contactId: payload.contactId,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating DEAL_STAGE_CHANGED trigger: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  @OnEvent(EVENT_NAMES.WIDGET_MESSAGE_RECEIVED)
  async handleWidgetMessageReceived(
    payload: WidgetMessageReceivedAutomationEvent,
  ): Promise<void> {
    this.logger.debug(
      `Evaluating automation triggers for widget message: ${payload.messageId}`,
    );
    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.WIDGET_MESSAGE_RECEIVED,
        eventPayload: {
          messageId: payload.messageId,
          sessionId: payload.sessionId,
          visitorId: payload.visitorId,
          visitorName: payload.visitorName,
          visitorPhone: payload.visitorPhone,
          body: payload.body,
        },
        context: {
          widget: {
            sessionId: payload.sessionId,
            visitorId: payload.visitorId,
            visitorName: payload.visitorName,
            visitorPhone: payload.visitorPhone,
            body: payload.body,
          },
        },
        contactId: undefined,
      });
    } catch (error) {
      this.logger.error(
        `Error evaluating WIDGET_MESSAGE_RECEIVED trigger: ${error instanceof Error ? error.message : 'Unknown'}`,
      );
    }
  }

  // ─── Automation Lifecycle WebSocket Broadcasts ──────

  @OnEvent(EVENT_NAMES.AUTOMATION_RULE_CREATED)
  async handleRuleCreated(payload: AutomationRuleCreatedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:rule_created', {
      ruleId: payload.ruleId,
      name: payload.name,
      triggerType: payload.triggerType,
    });
  }

  @OnEvent(EVENT_NAMES.AUTOMATION_RULE_ENABLED)
  async handleRuleEnabled(payload: AutomationRuleEnabledEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:rule_enabled', {
      ruleId: payload.ruleId,
    });
  }

  @OnEvent(EVENT_NAMES.AUTOMATION_RULE_DISABLED)
  async handleRuleDisabled(
    payload: AutomationRuleDisabledEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:rule_disabled', {
      ruleId: payload.ruleId,
    });
  }

  @OnEvent(EVENT_NAMES.AUTOMATION_RULE_DELETED)
  async handleRuleDeleted(payload: AutomationRuleDeletedEvent): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:rule_deleted', {
      ruleId: payload.ruleId,
    });
  }

  @OnEvent(EVENT_NAMES.AUTOMATION_EXECUTED)
  async handleAutomationExecuted(
    payload: AutomationExecutedEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:executed', {
      executionId: payload.executionId,
      ruleId: payload.ruleId,
      contactId: payload.contactId,
      executionTimeMs: payload.executionTimeMs,
    });
  }

  @OnEvent(EVENT_NAMES.AUTOMATION_FAILED)
  async handleAutomationFailed(
    payload: AutomationFailedEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:failed', {
      executionId: payload.executionId,
      ruleId: payload.ruleId,
      contactId: payload.contactId,
      error: payload.error,
    });
  }

  // ─── Scheduled Message WebSocket Broadcasts ──────

  @OnEvent(EVENT_NAMES.SCHEDULED_MESSAGE_EXECUTED)
  async handleScheduledMessageExecuted(
    payload: ScheduledMessageExecutedEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'scheduled_message:executed', {
      scheduledMessageId: payload.scheduledMessageId,
      contactPhone: payload.contactPhone,
    });
  }

  @OnEvent(EVENT_NAMES.SCHEDULED_MESSAGE_FAILED)
  async handleScheduledMessageFailed(
    payload: ScheduledMessageFailedEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'scheduled_message:failed', {
      scheduledMessageId: payload.scheduledMessageId,
      reason: payload.reason,
    });
  }

  @OnEvent(EVENT_NAMES.FOLLOW_UP_EXECUTED)
  async handleFollowUpExecuted(
    payload: FollowUpExecutedEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:follow_up_executed', {
      ruleId: payload.ruleId,
      contactId: payload.contactId,
    });
  }

  @OnEvent(EVENT_NAMES.FOLLOW_UP_CANCELLED)
  async handleFollowUpCancelled(
    payload: FollowUpCancelledEvent,
  ): Promise<void> {
    this.wsGateway.emitToOrg(payload.orgId, 'automation:follow_up_cancelled', {
      ruleId: payload.ruleId,
      contactId: payload.contactId,
      reason: payload.reason,
    });
  }
}
