import { Injectable, Logger } from '@nestjs/common';
import { AutomationActionType, MessageDirection, MessageStatus, MessageType } from '@prisma/client';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { MessageRepository } from '@/modules/messages/infrastructure/repositories/message.repository';
import { ConversationRepository } from '@/modules/messages/infrastructure/repositories/conversation.repository';
import { MessageEventRepository } from '@/modules/messages/infrastructure/repositories/message-event.repository';
import { WhatsAppSessionRepository } from '@/modules/whatsapp/infrastructure/repositories/whatsapp-session.repository';
import { QUEUE_NAMES, MESSAGING_CONFIG } from '@/common/constants';

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
    return template.replace(/\{\{([\w.]+)\}\}/g, (match, key: string) => vars[key] ?? match);
  }

  private buildVarMap(
    contact: { name: string | null; phoneNumber: string; email: string | null; leadStatus: string | null } | null,
    eventPayload?: Record<string, unknown>,
  ): Record<string, string> {
    const vars: Record<string, string> = {};

    if (contact) {
      vars['contact.name']       = contact.name ?? '';
      vars['contact.phone']      = contact.phoneNumber;
      vars['contact.email']      = contact.email ?? '';
      vars['contact.leadStatus'] = contact.leadStatus ?? '';
    }

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
    const contact = await this.prisma.contact.findUnique({
      where: { id: input.contactId },
      select: { phoneNumber: true, name: true, email: true, leadStatus: true, sessionId: true },
    });

    if (!contact) {
      return { actionType: AutomationActionType.SEND_MESSAGE, success: false, error: `Contact not found: ${input.contactId}` };
    }

    // Resolve sessionId: actionConfig → input → contact's session → any org session
    let resolvedSessionId = configSessionId || input.sessionId || contact.sessionId || undefined;

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
    const resolvedBody = this.interpolate(messageBody, varMap);
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
        { retryLimit: MESSAGING_CONFIG.MAX_RETRY_COUNT, retryDelay: MESSAGING_CONFIG.RETRY_BASE_DELAY_SECONDS, retryBackoff: true },
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
      await this.queueService.publishOnce(
        QUEUE_NAMES.AUTOMATION_EXECUTE_ACTION,
        { type: 'ASSIGN_CONTACT', orgId: input.orgId, contactId: input.contactId, assignToUserId, executionId: input.executionId, ruleId: input.ruleId },
        `auto-assign-${input.executionId}-${input.contactId}`,
      );
      return { actionType: AutomationActionType.ASSIGN_CONTACT, success: true, result: { assignToUserId, queued: true } };
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
      await this.queueService.publishOnce(
        QUEUE_NAMES.AUTOMATION_EXECUTE_ACTION,
        { type: 'ADD_TAG', orgId: input.orgId, contactId: input.contactId, tagId, tagName, executionId: input.executionId, ruleId: input.ruleId },
        `auto-tag-${input.executionId}-${input.contactId}-${tagId || tagName}`,
      );
      return { actionType: AutomationActionType.ADD_TAG, success: true, result: { tagId, tagName, queued: true } };
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

    try {
      await this.queueService.publishOnce(
        QUEUE_NAMES.AUTOMATION_EXECUTE_ACTION,
        { type: 'UPDATE_STATUS', orgId: input.orgId, contactId: input.contactId, newStatus, executionId: input.executionId, ruleId: input.ruleId },
        `auto-status-${input.executionId}-${input.contactId}`,
      );
      return { actionType: AutomationActionType.UPDATE_STATUS, success: true, result: { newStatus, queued: true } };
    } catch (error) {
      return { actionType: AutomationActionType.UPDATE_STATUS, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}
