import { Injectable, Logger } from '@nestjs/common';
import { AutomationTriggerType } from '@prisma/client';
import { ExecuteChatbotFlowUseCase } from '@/modules/chatbot/application/use-cases/execute-chatbot-flow.use-case';
import { EvaluateTriggerUseCase } from '@/modules/automation/application/use-cases/evaluate-trigger.use-case';

export interface IncomingWhatsAppMessage {
  messageId: string;
  orgId: string;
  conversationId: string;
  contactId: string;
  contactPhone: string;
  sessionId: string;
  body?: string;
  type?: string;
}

/**
 * Single entry point for all incoming WhatsApp messages.
 *
 * Enforces a strict priority order:
 *  1. Chatbot — if a flow matches and replies, the pipeline stops.
 *  2. Automation — evaluated only when chatbot did NOT handle the message.
 *
 * This prevents the race condition where both handlers fire concurrently
 * off the same WHATSAPP_MESSAGE_RECEIVED event and send two replies.
 */
@Injectable()
export class MessagePipelineService {
  private readonly logger = new Logger(MessagePipelineService.name);

  constructor(
    private readonly executeChatbotFlow: ExecuteChatbotFlowUseCase,
    private readonly evaluateTrigger: EvaluateTriggerUseCase,
  ) {}

  async processIncoming(payload: IncomingWhatsAppMessage): Promise<void> {
    // Only text messages are eligible for chatbot flows
    if (!payload.type || payload.type === 'TEXT') {
      const chatbotResult = await this.runChatbot(payload);
      if (chatbotResult?.replied) {
        this.logger.debug(
          `Chatbot handled message ${payload.messageId} — skipping automation`,
        );
        return;
      }
    }

    await this.runAutomation(payload);
  }

  private async runChatbot(
    payload: IncomingWhatsAppMessage,
  ): Promise<{ replied: boolean } | null> {
    try {
      const result = await this.executeChatbotFlow.execute({
        orgId: payload.orgId,
        conversationId: payload.conversationId,
        contactId: payload.contactId,
        contactPhone: payload.contactPhone,
        sessionId: payload.sessionId,
        messageBody: payload.body || '',
        messageType: payload.type || 'TEXT',
      });

      return result ? { replied: true } : null;
    } catch (error) {
      this.logger.error(
        `Chatbot execution failed for message ${payload.messageId}: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );
      return null;
    }
  }

  private async runAutomation(payload: IncomingWhatsAppMessage): Promise<void> {
    try {
      await this.evaluateTrigger.execute({
        orgId: payload.orgId,
        triggerType: AutomationTriggerType.MESSAGE_RECEIVED,
        eventPayload: {
          messageId: payload.messageId,
          sessionId: payload.sessionId,
          contactPhone: payload.contactPhone,
          type: payload.type,
          conversationId: payload.conversationId,
        },
        context: {
          message: {
            id: payload.messageId,
            type: payload.type,
            contactPhone: payload.contactPhone,
          },
        },
        contactId: undefined,
      });
    } catch (error) {
      this.logger.error(
        `Automation evaluation failed for message ${payload.messageId}: ${error instanceof Error ? error.message : 'Unknown'}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
