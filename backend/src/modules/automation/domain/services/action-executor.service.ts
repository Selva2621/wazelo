import { Injectable, Logger } from '@nestjs/common';
import {
  AutomationActionType,
  LeadStatus,
  MessageDirection,
  MessageStatus,
  MessageType,
  SequenceRecipientStatus,
} from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SequenceRepository } from '@/modules/sequences/infrastructure/repositories/sequence.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { EnrollContactUseCase } from '@/modules/sequences/application/use-cases/enroll-contact.use-case';
import { AssignContactUseCase } from '@/modules/contacts/application/use-cases/assign-contact.use-case';
import { AddTagUseCase } from '@/modules/contacts/application/use-cases/manage-tags.use-case';
import { ChangeLeadStatusUseCase } from '@/modules/contacts/application/use-cases/change-lead-status.use-case';
import { QUEUE_NAMES, MESSAGING_CONFIG, CAMPAIGN_CONFIG, EVENT_NAMES } from '@/common/constants';
import { fillContactPlaceholders } from '@/shared/utils/contact-placeholders';

export interface ActionExecutionInput {
  orgId: string;
  contactId: string;
  sessionId?: string;
  actionType: AutomationActionType;
  actionConfig: Record<string, unknown>;
  executionId: string;
  ruleId: string;
  eventPayload?: Record<string, unknown>;
}

export interface ActionResult {
  actionType: AutomationActionType;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);

  constructor(
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
    private readonly messageRepo: MessageRepository,
    private readonly conversationRepo: ConversationRepository,
    private readonly messageEventRepo: MessageEventRepository,
    private readonly sessionRepo: WhatsAppSessionRepository,
    private readonly enrollContact: EnrollContactUseCase,
    private readonly assignContact: AssignContactUseCase,
    private readonly addTag: AddTagUseCase,
    private readonly changeLeadStatus: ChangeLeadStatusUseCase,
    private readonly sequenceRepo: SequenceRepository,
    private readonly events: EventEmitter2,
  ) {}

  async execute(input: ActionExecutionInput): Promise<ActionResult> {
    switch (input.actionType) {
      case AutomationActionType.SEND_MESSAGE:
        return this.executeSendMessage(input);
      case AutomationActionType.ASSIGN_CONTACT:
        return this.executeAssignContact(input);
      case AutomationActionType.ADD_TAG:
        return this.executeAddTag(input);
      case AutomationActionType.UPDATE_STATUS:
        return this.executeUpdateStatus(input);
      case AutomationActionType.ENROLL_IN_SEQUENCE:
        return this.executeEnrollInSequence(input);
      case AutomationActionType.STOP_SEQUENCE:
        return this.executeStopSequence(input);
      case AutomationActionType.ASSIGN_CONVERSATION:
        return this.executeAssignConversation(input);
      default:
        return {
          actionType: input.actionType,
          success: false,
          error: `Unknown action type: ${input.actionType}`,
        };
    }
  }

  // ─── Variable interpolation ───────────────────────────────────────────────

  private interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => vars[key] ?? match);
  }

  private buildVarMap(
    contact: { name: string | null; phoneNumber: string; email: string | null; leadStatus: string | null } | null,
    eventPayload?: Record<string, unknown>,
  ): Record<string, string> {
    const vars: Record<string, string> = {};

    // Contact fields ({{name}}, {{contact.name}}…) are filled by the shared helper; these are the extras
    if (eventPayload) {
      if (eventPayload.orderName)        vars['shopify.order_name']       = String(eventPayload.orderName);
      if (eventPayload.totalPrice)       vars['shopify.total_price']      = String(eventPayload.totalPrice);
      if (eventPayload.currency)         vars['shopify.currency']         = String(eventPayload.currency);
      if (eventPayload.financialStatus)  vars['shopify.financial_status'] = String(eventPayload.financialStatus);
      if (eventPayload.recoveryUrl)      vars['shopify.recovery_url']     = String(eventPayload.recoveryUrl);
      if (eventPayload.cartTotal)        vars['shopify.cart_total']       = String(eventPayload.cartTotal);

      const items = (eventPayload.items ?? eventPayload.lineItems) as Array<{ quantity: number; title: string }> | undefined;
      if (Array.isArray(items)) {
        vars['shopify.items'] = items.map((i) => `${i.quantity}x ${i.title}`).join(', ');
      }
    }

    return vars;
  }

  // ─── SEND_MESSAGE ─────────────────────────────────────────────────────────

  private async executeSendMessage(input: ActionExecutionInput): Promise<ActionResult> {
    const { messageBody, messageType, sessionId: configSessionId } =
      input.actionConfig as { messageBody?: string; messageType?: string; sessionId?: string };

    if (!messageBody) {
      return { actionType: AutomationActionType.SEND_MESSAGE, success: false, error: 'Missing messageBody in action config' };
    }

    // Load contact — need phone number + name for conversation creation
    const contact = await this.prisma.contact.findFirst({
      where: { id: input.contactId, orgId: input.orgId },
      select: {
        phoneNumber: true, name: true, email: true, leadStatus: true, sessionId: true,
        optedOut: true, deletedAt: true, mergedIntoId: true,
      },
    });

    if (!contact) {
      return { actionType: AutomationActionType.SEND_MESSAGE, success: false, error: `Contact not found: ${input.contactId}` };
    }

    // A reply to the contact's own message (MESSAGE_RECEIVED) vs a message we start
    // ourselves (contact created, deal stage, no-reply, Shopify…)
    const inbound = input.eventPayload?.inbound === true;
    const inboundSessionId =
      inbound && typeof input.eventPayload?.sessionId === 'string' ? input.eventPayload.sessionId : undefined;

    // Skipped, not failed: later actions in the rule (tag, assign…) still run
    const skip = (reason: string): ActionResult => {
      this.logger.debug(`SEND_MESSAGE skipped (${reason}): execution=${input.executionId}`);
      return { actionType: AutomationActionType.SEND_MESSAGE, success: true, result: { skipped: true, reason } };
    };
    if (contact.deletedAt || contact.mergedIntoId) return skip('Contact deleted or merged');
    // A new contact who wrote first is greeted by the chatbot — one welcome, not two
    if (input.eventPayload?.welcomeByChatbot === true) return skip('The chatbot greets new chats');
    // Opted out: no messages we start. A reply to something they just wrote is still fine.
    if (contact.optedOut && !inbound) return skip('Contact opted out');

    // Resolve sessionId: replies go out on the number the contact wrote to;
    // otherwise actionConfig → input → contact's session → any org session
    let resolvedSessionId =
      inboundSessionId || configSessionId || input.sessionId || contact.sessionId || undefined;

    if (!resolvedSessionId) {
      // Fallback: use any active connected session in the org
      const anySession = await this.sessionRepo.findAnyActiveByOrgId(input.orgId);
      resolvedSessionId = anySession?.id;
    }

    if (!resolvedSessionId) {
      return {
        actionType: AutomationActionType.SEND_MESSAGE,
        success: false,
        error: 'No active WhatsApp session found for this org. Connect a WhatsApp session first.',
      };
    }

    // Interpolate variables
    const varMap = this.buildVarMap(contact, input.eventPayload);
    const resolvedBody = this.interpolate(fillContactPlaceholders(messageBody, contact), varMap);
    const idempotencyKey = `auto-msg-${input.executionId}-${input.actionType}`;

    // Idempotency: skip if already created
    const existing = await this.messageRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) {
      return { actionType: AutomationActionType.SEND_MESSAGE, success: true, result: { deduplicated: true, messageId: existing.id } };
    }

    try {
      // Find or create conversation
      const conversation = await this.conversationRepo.findOrCreate({
        orgId: input.orgId,
        sessionId: resolvedSessionId,
        contactPhone: contact.phoneNumber,
        contactId: input.contactId,
      });

      // Create Message record in DB (QUEUED status)
      const message = await this.messageRepo.create({
        orgId: input.orgId,
        sessionId: resolvedSessionId,
        conversationId: conversation.id,
        direction: MessageDirection.OUTBOUND,
        type: (messageType as MessageType) || MessageType.TEXT,
        contactPhone: contact.phoneNumber,
        contactName: contact.name ?? undefined,
        body: resolvedBody,
        idempotencyKey,
        // Messages we start go through the bulk lane: opt-out re-check at send time,
        // sending hours and warm-up caps (same protection as campaigns and sequences).
        // Replies stay in the direct lane so the contact isn't kept waiting.
        priority: inbound ? 0 : CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY,
        maxRetries: MESSAGING_CONFIG.MAX_RETRY_COUNT,
        metadata: { automationRuleId: input.ruleId, automationExecutionId: input.executionId },
      });

      // Record QUEUED event
      await this.messageEventRepo.record({
        messageId: message.id,
        orgId: input.orgId,
        status: MessageStatus.QUEUED,
        metadata: { automationRuleId: input.ruleId },
      });

      // Queue for sending — correct shape: {messageId, sessionId, orgId}
      await this.queueService.publishOnce(
        QUEUE_NAMES.SEND_WHATSAPP_MESSAGE,
        { messageId: message.id, sessionId: resolvedSessionId, orgId: input.orgId },
        `msg-${message.id}`,
        {
          retryLimit: MESSAGING_CONFIG.MAX_RETRY_COUNT,
          retryDelay: MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS,
          retryBackoff: true,
          ...(inbound ? {} : { priority: CAMPAIGN_CONFIG.CAMPAIGN_MESSAGE_PRIORITY }),
        },
      );

      return { actionType: AutomationActionType.SEND_MESSAGE, success: true, result: { messageId: message.id, queued: true } };
    } catch (error) {
      this.logger.error(`Failed to create/queue SEND_MESSAGE: execution=${input.executionId}`, error);
      return { actionType: AutomationActionType.SEND_MESSAGE, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ─── ASSIGN_CONTACT ───────────────────────────────────────────────────────

  private async executeAssignContact(input: ActionExecutionInput): Promise<ActionResult> {
    const { assignToUserId } = input.actionConfig as { assignToUserId?: string };

    if (!assignToUserId) {
      return { actionType: AutomationActionType.ASSIGN_CONTACT, success: false, error: 'Missing assignToUserId in action config' };
    }

    try {
      const actor = await this.ruleActor(input);
      await this.assignContact.execute(input.contactId, input.orgId, actor, {
        ownerId: assignToUserId,
        reason: 'Automation rule',
      });
      return { actionType: AutomationActionType.ASSIGN_CONTACT, success: true, result: { assignToUserId } };
    } catch (error) {
      return { actionType: AutomationActionType.ASSIGN_CONTACT, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ─── ADD_TAG ──────────────────────────────────────────────────────────────

  private async executeAddTag(input: ActionExecutionInput): Promise<ActionResult> {
    const { tagId, tagName } = input.actionConfig as { tagId?: string; tagName?: string };

    if (!tagId && !tagName) {
      return { actionType: AutomationActionType.ADD_TAG, success: false, error: 'Missing tagId or tagName in action config' };
    }

    try {
      // Rules store the tag by name; older ones may only have its id
      const name =
        tagName ||
        (await this.prisma.tag.findFirst({ where: { id: tagId, orgId: input.orgId, deletedAt: null }, select: { name: true } }))?.name;
      if (!name) {
        return { actionType: AutomationActionType.ADD_TAG, success: false, error: 'Tag not found' };
      }
      const actor = await this.ruleActor(input);
      await this.addTag.execute(input.contactId, input.orgId, actor, { name });
      return { actionType: AutomationActionType.ADD_TAG, success: true, result: { tagName: name } };
    } catch (error) {
      return { actionType: AutomationActionType.ADD_TAG, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ─── UPDATE_STATUS ────────────────────────────────────────────────────────

  private async executeUpdateStatus(input: ActionExecutionInput): Promise<ActionResult> {
    const { newStatus } = input.actionConfig as { newStatus?: string };

    if (!newStatus) {
      return { actionType: AutomationActionType.UPDATE_STATUS, success: false, error: 'Missing newStatus in action config' };
    }

    if (!(Object.values(LeadStatus) as string[]).includes(newStatus)) {
      return { actionType: AutomationActionType.UPDATE_STATUS, success: false, error: `Unknown lead status: ${newStatus}` };
    }

    try {
      // Goes through the normal status change, so "lead status changed" sequences and rules
      // fire too (the automation loop guard stops a rule re-triggering itself)
      const actor = await this.ruleActor(input);
      await this.changeLeadStatus.execute(input.contactId, input.orgId, actor, {
        status: newStatus as LeadStatus,
        reason: 'Automation rule',
      });
      return { actionType: AutomationActionType.UPDATE_STATUS, success: true, result: { newStatus } };
    } catch (error) {
      return { actionType: AutomationActionType.UPDATE_STATUS, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ─── STOP_SEQUENCE ────────────────────────────────────────────────────────

  /** Take the contact out of one sequence (sequenceId) or every sequence they're in. */
  private async executeStopSequence(input: ActionExecutionInput): Promise<ActionResult> {
    const { sequenceId } = input.actionConfig as { sequenceId?: string };
    const actionType = AutomationActionType.STOP_SEQUENCE;
    try {
      const running = await this.prisma.sequenceRecipient.findMany({
        where: {
          orgId: input.orgId,
          contactId: input.contactId,
          status: { in: [SequenceRecipientStatus.ACTIVE, SequenceRecipientStatus.PAUSED] },
          ...(sequenceId && { sequenceId }),
        },
        select: { id: true, sequenceId: true },
      });
      for (const r of running) {
        // Steps already queued are dropped at send time (the recipient has exited)
        await this.sequenceRepo.exitRecipient(r.id, 'Stopped by automation');
        await this.sequenceRepo.updateSequenceCounters(r.sequenceId);
      }
      return { actionType, success: true, result: { stopped: running.length } };
    } catch (error) {
      return { actionType, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // ─── ASSIGN_CONVERSATION ──────────────────────────────────────────────────

  /**
   * Give the contact's chat to a person. Same effect as assigning it in the inbox:
   * the chatbot and automation replies pause there (CONVERSATION_ASSIGNED).
   */
  private async executeAssignConversation(input: ActionExecutionInput): Promise<ActionResult> {
    const { assignToUserId } = input.actionConfig as { assignToUserId?: string };
    const actionType = AutomationActionType.ASSIGN_CONVERSATION;
    if (!assignToUserId) return { actionType, success: false, error: 'Missing assignToUserId in action config' };

    try {
      const user = await this.prisma.user.findFirst({
        where: { id: assignToUserId, orgId: input.orgId, deletedAt: null },
        select: { id: true },
      });
      if (!user) return { actionType, success: false, error: 'That team member is no longer in the workspace' };

      // The chat the trigger came from, else the contact's most recent one
      const fromEvent = input.eventPayload?.conversationId;
      const conversation =
        typeof fromEvent === 'string'
          ? await this.prisma.conversation.findFirst({ where: { id: fromEvent, orgId: input.orgId }, select: { id: true } })
          : await this.latestConversation(input.orgId, input.contactId);
      if (!conversation) return { actionType, success: true, result: { skipped: true, reason: 'No chat with this contact yet' } };

      await this.conversationRepo.assignTo(conversation.id, assignToUserId);
      this.events.emit(EVENT_NAMES.CONVERSATION_ASSIGNED, {
        conversationId: conversation.id,
        orgId: input.orgId,
        assignedToId: assignToUserId,
        assignedById: await this.ruleActor(input),
      });
      return { actionType, success: true, result: { conversationId: conversation.id, assignToUserId } };
    } catch (error) {
      return { actionType, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  private async latestConversation(orgId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({ where: { id: contactId, orgId }, select: { phoneNumber: true } });
    if (!contact) return null;
    const digits = contact.phoneNumber.replace(/^\+/, '');
    return this.prisma.conversation.findFirst({
      where: { orgId, deletedAt: null, contactPhone: { in: [digits, `+${digits}`] } },
      orderBy: { lastMessageAt: 'desc' },
      select: { id: true },
    });
  }

  /** Contact changes made by a rule are recorded as done by the person who created the rule. */
  private async ruleActor(input: ActionExecutionInput): Promise<string> {
    const rule = await this.prisma.automationRule.findFirst({
      where: { id: input.ruleId, orgId: input.orgId },
      select: { createdById: true },
    });
    if (!rule) throw new Error(`Automation rule not found: ${input.ruleId}`);
    return rule.createdById;
  }

  // ─── ENROLL_IN_SEQUENCE ───────────────────────────────────────────────────

  private async executeEnrollInSequence(input: ActionExecutionInput): Promise<ActionResult> {
    const { sequenceId } = input.actionConfig as { sequenceId?: string };
    const actionType = AutomationActionType.ENROLL_IN_SEQUENCE;

    if (!sequenceId) {
      return { actionType, success: false, error: 'Missing sequenceId in action config' };
    }

    try {
      const result = await this.enrollContact.execute(input.orgId, sequenceId, input.contactId);
      if (result.enrolled) return { actionType, success: true, result: { sequenceId, recipientId: result.recipientId } };
      // Already in the sequence is the outcome the rule wanted, not a failure
      if (result.reason === 'ALREADY_ACTIVE') return { actionType, success: true, result: { sequenceId, skipped: result.reason } };
      return { actionType, success: false, error: `Not added to sequence: ${result.reason}` };
    } catch (error) {
      return { actionType, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
