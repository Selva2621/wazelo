import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENT_NAMES } from '@/common/constants';
import { ExecuteChatbotFlowUseCase } from '@/modules/chatbot/application/use-cases/execute-chatbot-flow.use-case';

/**
 * Listens for incoming WhatsApp messages and triggers matching chatbot flows.
 */
@Injectable()
export class ChatbotTriggerHandler {
  private readonly logger = new Logger(ChatbotTriggerHandler.name);

  constructor(
    private readonly executeChatbotFlow: ExecuteChatbotFlowUseCase,
  ) {}

  @OnEvent(EVENT_NAMES.WHATSAPP_MESSAGE_RECEIVED)
  async handleIncomingMessage(payload: {
    messageId: string;
    orgId: string;
    conversationId: string;
    contactId: string;
    contactPhone: string;
    sessionId: string;
    body?: string;
    type?: string;
  }) {
    // Only process text messages for chatbot
    if (payload.type && payload.type !== 'TEXT') return;

    try {
      await this.executeChatbotFlow.execute({
        orgId: payload.orgId,
        conversationId: payload.conversationId,
        contactId: payload.contactId,
        contactPhone: payload.contactPhone,
        sessionId: payload.sessionId,
        messageBody: payload.body || '',
        messageType: payload.type || 'TEXT',
      });
    } catch (error) {
      this.logger.error(
        `Chatbot trigger failed for message ${payload.messageId}: ${error.message}`,
        error.stack,
      );
    }
  }
}
